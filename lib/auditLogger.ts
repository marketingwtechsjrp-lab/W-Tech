import { supabase } from './supabaseClient';

export interface AuditLogPayload {
  action_type: 'ACCESS' | 'MODIFICATION';
  screen: string;
  details: string;
}

/**
 * Logs a user activity (access or modification) to the database.
 * @param payload The type, screen, and details of the action.
 * @param currentUser The currently authenticated user object { id: string, name: string }.
 */
export async function logUserActivity(payload: AuditLogPayload, currentUser: { id: string; name: string } | null) {
  if (!currentUser) return;
  
  try {
    const { error } = await supabase.from('SITE_AuditLogs').insert({
      user_id: currentUser.id,
      user_name: currentUser.name || 'Usuário',
      action_type: payload.action_type,
      screen: payload.screen,
      details: payload.details
    });
    
    if (error) {
      console.error('Failed to save audit log:', error);
    }
  } catch (err) {
    console.error('Audit logger error:', err);
  }
}
