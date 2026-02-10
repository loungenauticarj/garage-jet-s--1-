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

// Update user
export async function updateUser(userId: string, updates: Partial<User>): Promise<{ user: User | null; error: string | null }> {
    try {
        const updateData: any = {};

        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.phone !== undefined) updateData.phone = updates.phone;
        if (updates.cpf !== undefined) updateData.cpf = updates.cpf;
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
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', userId);

        if (error) {
            console.error('Error deleting user:', error);
            return { success: false, error: error.message };
        }

        return { success: true, error: null };
    } catch (err: any) {
        console.error('Unexpected error deleting user:', err);
        return { success: false, error: err.message };
    }
}
