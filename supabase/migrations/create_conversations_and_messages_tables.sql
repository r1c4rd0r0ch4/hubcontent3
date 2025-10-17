/*
  # Create messages and conversations tables
  1. New Tables: conversations (id uuid, participant1_id uuid, participant2_id uuid, last_message_at timestamptz)
                 messages (id uuid, conversation_id uuid, sender_id uuid, content text, created_at timestamptz, is_read boolean)
  2. Security: Enable RLS, add policies for authenticated users to manage their conversations and messages.
  3. Add receiver_id to messages table for RLS policy on updates.
*/

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant1_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant2_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_conversation_pair UNIQUE (LEAST(participant1_id, participant2_id), GREATEST(participant1_id, participant2_id))
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations" ON conversations
  FOR SELECT TO authenticated
  USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

CREATE POLICY "Users can create conversations with other users" ON conversations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = participant1_id OR auth.uid() = participant2_id);

CREATE POLICY "Users can update their own conversations" ON conversations
  FOR UPDATE TO authenticated
  USING (auth.uid() = participant1_id OR auth.uid() = participant2_id)
  WITH CHECK (auth.uid() = participant1_id OR auth.uid() = participant2_id);

CREATE POLICY "Users can delete their own conversations" ON conversations
  FOR DELETE TO authenticated
  USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);


-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  is_read boolean DEFAULT false
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Add receiver_id to messages table for RLS policy on updates
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='receiver_id') THEN
        ALTER TABLE messages ADD COLUMN receiver_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END
$$;

-- Update existing messages with receiver_id (if any)
UPDATE messages m
SET receiver_id = CASE
    WHEN c.participant1_id = m.sender_id THEN c.participant2_id
    ELSE c.participant1_id
END
FROM conversations c
WHERE m.conversation_id = c.id AND m.receiver_id IS NULL;

-- Make receiver_id NOT NULL after backfill
ALTER TABLE messages ALTER COLUMN receiver_id SET NOT NULL;


CREATE POLICY "Users can view messages in their conversations" ON messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.participant1_id = auth.uid() OR conversations.participant2_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their conversations" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.participant1_id = auth.uid() OR conversations.participant2_id = auth.uid())
    )
  );

CREATE POLICY "Users can mark their received messages as read" ON messages
  FOR UPDATE TO authenticated
  USING (
    NOT is_read AND receiver_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.participant1_id = auth.uid() OR conversations.participant2_id = auth.uid())
    )
  )
  WITH CHECK (
    is_read = TRUE AND receiver_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.participant1_id = auth.uid() OR conversations.participant2_id = auth.uid())
    )
  );

-- Add a trigger to update last_message_at in conversations when a new message is inserted
CREATE OR REPLACE FUNCTION update_conversation_last_message_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER update_conversation_last_message_at_trigger
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message_at();