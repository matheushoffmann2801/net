import React from 'react';
import { FileText } from 'lucide-react';

export default function AuditTab({ auditLogs }) {
  return (
    <div className="overflow-x-auto animate-fade-in">
      {auditLogs.length === 0 ? (
        <div className="p-8 text-center text-gray-400 bg-white rounded-xl shadow-sm border border-gray-200">
          Nenhum log de auditoria encontrado.
        </div>
      ) : (
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-gray-50 border-b-2 border-gray-200">
            <tr>
              <th className="p-3 text-gray-600 font-semibold">Data</th>
              <th className="p-3 text-gray-600 font-semibold">Usuário</th>
              <th className="p-3 text-gray-600 font-semibold">Ação</th>
              <th className="p-3 text-gray-600 font-semibold">Recurso</th>
              <th className="p-3 text-gray-600 font-semibold">Detalhes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {auditLogs.map(log => (
              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-3 text-gray-500">{new Date(log.createdAt).toLocaleString()}</td>
                <td className="p-3 font-medium text-gray-700">{log.user?.name || 'Sistema'}</td>
                <td className="p-3">
                  <span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold text-gray-600">
                    {log.action}
                  </span>
                </td>
                <td className="p-3 text-gray-700">{log.resource}</td>
                <td className="p-3 text-gray-600">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
