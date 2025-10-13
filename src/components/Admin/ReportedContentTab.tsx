import React from 'react';
import { useAdminData } from '../../hooks/useAdminData';
import { AdminCard } from './AdminCard';
import { supabase } from '../../lib/supabase';
import { CheckCircle, XCircle, Loader2, Eye, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const ReportedContentTab: React.FC = () => {
  const { reportedContent, loading, error, refetch } = useAdminData();
  const [processingReportId, setProcessingReportId] = React.useState<string | null>(null);

  const handleReportStatusUpdate = async (reportId: string, contentId: string, status: 'reviewed' | 'resolved', action: 'approve_content' | 'reject_content') => {
    setProcessingReportId(reportId);
    try {
      // Update reported_content status
      const { error: reportError } = await supabase
        .from('reported_content')
        .update({ status: status, admin_notes: `Content ${action === 'approve_content' ? 'approved' : 'rejected'} by admin.`, reported_at: new Date().toISOString() }) // Using reported_at as updated_at
        .eq('id', reportId);

      if (reportError) throw reportError;

      // Update content status based on admin action
      if (action === 'reject_content') {
        const { error: contentError } = await supabase
          .from('content')
          .update({ status: 'rejected', updated_at: new Date().toISOString() })
          .eq('id', contentId);

        if (contentError) throw contentError;
      } else if (action === 'approve_content') {
        // If content was previously rejected, this would re-approve it.
        // For now, we assume 'approve_content' means the report was unfounded or content is fine.
        // No change to content status if it's already approved.
      }

      // Log admin action
      await supabase.from('admin_logs').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id || '',
        action: `Reported content ${action === 'approve_content' ? 'approved' : 'rejected'}`,
        target_user_id: null, // No specific user target for content action, but could be influencer_id
        details: { report_id: reportId, content_id: contentId, action_taken: action },
      });

      toast.success(`Conteúdo reportado ${action === 'approve_content' ? 'aprovado' : 'rejeitado'} com sucesso!`);
      refetch(); // Refresh data
    } catch (err) {
      console.error('Error updating reported content status:', err);
      toast.error('Falha ao atualizar status do conteúdo reportado.');
    } finally {
      setProcessingReportId(null);
    }
  };

  if (loading) {
    return (
      <AdminCard title="Moderação de Conteúdo">
        <div className="flex items-center justify-center py-10 text-textSecondary">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando conteúdo reportado...
        </div>
      </AdminCard>
    );
  }

  if (error) {
    return (
      <AdminCard title="Moderação de Conteúdo">
        <div className="text-error text-center py-10">{error}</div>
      </AdminCard>
    );
  }

  return (
    <AdminCard title="Conteúdo Reportado Pendente">
      {reportedContent.length === 0 ? (
        <p className="text-textSecondary italic">Nenhum conteúdo reportado pendente de revisão.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportedContent.map((report) => (
            <div key={report.id} className="bg-surface p-5 rounded-lg border border-border shadow-md flex flex-col">
              <p className="text-lg font-semibold text-text mb-2">{report.content?.title || 'Conteúdo Desconhecido'}</p>
              <p className="text-sm text-textSecondary mb-2">Reportado por: {report.reporter_id}</p>
              <p className="text-sm text-textSecondary mb-4">Motivo: <span className="font-medium text-text">{report.reason}</span></p>

              {report.content && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-text mb-2">Detalhes do Conteúdo:</p>
                  <div className="flex items-center gap-3">
                    {report.content.media_url && (
                      <img src={report.content.media_url} alt={report.content.title} className="w-16 h-16 object-cover rounded-md" />
                    )}
                    <div>
                      <p className="text-sm text-text">{report.content.description?.substring(0, 50)}...</p>
                      <a
                        href={`/content/${report.content.id}`} // Assuming a content detail page
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-primary hover:underline text-xs transition-colors mt-1"
                      >
                        Ver Conteúdo <Eye className="w-3 h-3 ml-1" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-auto pt-4 border-t border-border/50">
                <button
                  onClick={() => handleReportStatusUpdate(report.id, report.content_id, 'resolved', 'approve_content')}
                  disabled={processingReportId === report.id}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-success/20 text-success rounded-lg hover:bg-success/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingReportId === report.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                  Manter Conteúdo
                </button>
                <button
                  onClick={() => handleReportStatusUpdate(report.id, report.content_id, 'resolved', 'reject_content')}
                  disabled={processingReportId === report.id}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-error/20 text-error rounded-lg hover:bg-error/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingReportId === report.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5 mr-2" />}
                  Remover Conteúdo
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminCard>
  );
};
