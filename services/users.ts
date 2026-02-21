import { supabase } from '../supabaseClient';
import { User } from '../types';

// Get all users (MARINA only)
export async function getAllUsers(): Promise<{ users: User[]; error: string | null }> {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
                console.error('Error fetching users:', {
                    status: (error as any).status,
                    code: (error as any).code,
                    message: (error as any).message,
                    details: (error as any).details,
                });
                console.error('Raw supabase error object:', error);
                return { users: [], error: (error as any).message || error };
        }

        const users: User[] = data.map((u: any) => ({
            id: u.id,
            email: u.email,
            name: u.name,
            phone: u.phone,
            cpf: u.cpf,
            address: u.address,
            cep: u.cep,
            registrationCode: u.registration_code,
            role: u.role,
            ownerType: u.owner_type || 'UNICO',
            jetName: u.jet_name || '',
            monthlyDueDate: u.monthly_due_date,
            monthlyValue: u.monthly_value,
            isBlocked: u.is_blocked,
            jetSkiManufacturer: u.jet_ski_manufacturer,
            jetSkiModel: u.jet_ski_model,
            jetSkiYear: u.jet_ski_year,
        }));

        return { users, error: null };
    } catch (err: any) {
        console.error('Unexpected error fetching users:', err);
        return { users: [], error: err.message };
    }
}

// Get user by id
export async function getUserById(userId: string): Promise<{ user: User | null; error: string | null }> {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching user by id:', error);
            return { user: null, error: error.message };
        }

        const user: User = {
            id: data.id,
            email: data.email,
            name: data.name,
            phone: data.phone,
            cpf: data.cpf,
            address: data.address,
            cep: data.cep,
            registrationCode: data.registration_code,
            role: data.role,
            ownerType: data.owner_type || 'UNICO',
            jetName: data.jet_name || '',
            monthlyDueDate: data.monthly_due_date,
            monthlyValue: data.monthly_value,
            isBlocked: data.is_blocked,
            jetSkiManufacturer: data.jet_ski_manufacturer,
            jetSkiModel: data.jet_ski_model,
            jetSkiYear: data.jet_ski_year,
        };

        return { user, error: null };
    } catch (err: any) {
        console.error('Unexpected error fetching user by id:', err);
        return { user: null, error: err.message };
    }
}

// Update user
export async function updateUser(userId: string, updates: Partial<User>): Promise<{ user: User | null; error: string | null }> {
    try {
        const updateData: any = {};

        const normalizedCpf = updates.cpf?.trim();
        if (updates.cpf !== undefined) {
            updateData.cpf = normalizedCpf ? normalizedCpf : null;
        }

        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.phone !== undefined) updateData.phone = updates.phone;
        if (updates.address !== undefined) updateData.address = updates.address;
        if (updates.cep !== undefined) updateData.cep = updates.cep;
        if (updates.monthlyDueDate !== undefined) updateData.monthly_due_date = updates.monthlyDueDate;
        if (updates.monthlyValue !== undefined) updateData.monthly_value = updates.monthlyValue;
        if (updates.isBlocked !== undefined) updateData.is_blocked = updates.isBlocked;
        if (updates.jetSkiManufacturer !== undefined) updateData.jet_ski_manufacturer = updates.jetSkiManufacturer;
        if (updates.jetSkiModel !== undefined) updateData.jet_ski_model = updates.jetSkiModel;
        if (updates.jetSkiYear !== undefined) updateData.jet_ski_year = updates.jetSkiYear;
        if (updates.ownerType !== undefined) updateData.owner_type = updates.ownerType;
        if (updates.jetName !== undefined) updateData.jet_name = updates.jetName;

        const { data, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            console.error('Error updating user:', error);
            return { user: null, error: error.message };
        }

        const user: User = {
            id: data.id,
            email: data.email,
            name: data.name,
            phone: data.phone,
            cpf: data.cpf,
            address: data.address,
            cep: data.cep,
            registrationCode: data.registration_code,
            role: data.role,
            ownerType: data.owner_type || 'UNICO',
            jetName: data.jet_name || '',
            monthlyDueDate: data.monthly_due_date,
            monthlyValue: data.monthly_value,
            isBlocked: data.is_blocked,
            jetSkiManufacturer: data.jet_ski_manufacturer,
            jetSkiModel: data.jet_ski_model,
            jetSkiYear: data.jet_ski_year,
        };

        return { user, error: null };
    } catch (err: any) {
        if (err?.name === 'TypeError' && String(err?.message).includes('Failed to fetch')) {
            console.error('Network error updating user (Failed to fetch). Check Supabase URL and network connectivity.', {
                supabaseUrl: (import.meta as any).env?.VITE_SUPABASE_URL,
                message: err?.message,
            });
        } else {
            console.error('Unexpected error updating user:', err);
        }
        return { user: null, error: err.message };
    }
}

// Delete user
export async function deleteUser(userId: string): Promise<{ success: boolean; error: string | null }> {
    try {
        console.log('[usersService.deleteUser] Iniciando deleção do usuário:', userId);
        
        // First, delete reservations
        const { error: reservationsError } = await supabase
            .from('reservations')
            .delete()
            .eq('user_id', userId);

        if (reservationsError) {
            console.error('[usersService.deleteUser] Erro ao deletar reservas:', reservationsError);
            return { success: false, error: `Erro ao remover reservas do cliente: ${reservationsError.message}` };
        }

        console.log('[usersService.deleteUser] Reservas deletadas com sucesso');

        // Then delete the user
        const { error, count, data: deleteData } = await supabase
            .from('users')
            .delete()
            .eq('id', userId)
            .select();

        console.log('[usersService.deleteUser] Resultado do DELETE:', {
            error,
            count,
            deletedRows: deleteData?.length || 0
        });

        if (error) {
            console.error('[usersService.deleteUser] Erro ao deletar usuário:', error);
            console.error('[usersService.deleteUser] Detalhes do erro:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            
            // Se for erro de permissão/RLS
            if (error.code === '42501' || error.message.includes('policy')) {
                return { 
                    success: false, 
                    error: 'ERRO DE PERMISSÃO (RLS):\n\n' +
                           'Execute o arquivo FIX_RLS_POLICIES.sql no Supabase.\n\n' +
                           'Instruções em COMO_CORRIGIR_DELECAO.md'
                };
            }
            
            return { success: false, error: `Erro ao remover cliente: ${error.message}` };
        }

        // Verify deletion by trying to fetch the user
        const { data: verifyData, error: verifyError } = await supabase
            .from('users')
            .select('id')
            .eq('id', userId)
            .maybeSingle();  // Use maybeSingle para não dar erro se não encontrar

        console.log('[usersService.deleteUser] Verificação pós-deleção:', {
            usuarioAindaExiste: !!verifyData,
            erroVerificacao: verifyError?.message
        });

        if (verifyData) {
            console.error('[usersService.deleteUser] ❌ FALHA: Usuário ainda existe no banco após deleção!');
            console.error('[usersService.deleteUser] 📋 SOLUÇÃO: Execute o script FIX_RLS_POLICIES.sql no Supabase SQL Editor');
            console.error('[usersService.deleteUser] 📄 Veja instruções em: COMO_CORRIGIR_DELECAO.md');
            return { 
                success: false, 
                error: '❌ ERRO RLS: Usuário não foi removido!\n\n' +
                       '📋 Execute o arquivo FIX_RLS_POLICIES.sql\n' +
                       '   no Supabase SQL Editor.\n\n' +
                       '📄 Instruções em: COMO_CORRIGIR_DELECAO.md'
            };
        }

        console.log('[usersService.deleteUser] ✅ Verificação concluída: Usuário removido com sucesso');
        return { success: true, error: null };
    } catch (err: any) {
        console.error('[usersService.deleteUser] Erro inesperado:', err);
        return { success: false, error: err.message };
    }
}
