import { supabase } from '../supabaseClient';
import { Reservation, JetStatus } from '../types';

// Get user reservations
export async function getUserReservations(userId: string): Promise<{ reservations: Reservation[]; error: string | null }> {
    try {
        const { data, error } = await supabase
            .from('reservations')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
                console.error('Error fetching user reservations:', {
                    status: (error as any).status,
                    code: (error as any).code,
                    message: (error as any).message,
                    details: (error as any).details,
                });
                console.error('Raw supabase error object:', error);
                return { reservations: [], error: (error as any).message || error };
        }

        const reservations: Reservation[] = data.map((r: any) => ({
            id: r.id,
            userId: r.user_id,
            userName: r.user_name,
            jetName: r.jet_name || r.jetName || '',
            date: r.date,
            time: r.time,
            route: r.route,
            status: r.status as JetStatus,
            photos: r.photos || [],
        }));

        return { reservations, error: null };
    } catch (err: any) {
        console.error('Unexpected error fetching user reservations:', err);
        return { reservations: [], error: err.message };
    }
}

// Get all reservations (MARINA only)
export async function getAllReservations(): Promise<{ reservations: Reservation[]; error: string | null }> {
    try {
        const { data, error } = await supabase
            .from('reservations')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
                console.error('Error fetching all reservations:', {
                    status: (error as any).status,
                    code: (error as any).code,
                    message: (error as any).message,
                    details: (error as any).details,
                });
                console.error('Raw supabase error object:', error);
                return { reservations: [], error: (error as any).message || error };
        }

        const reservations: Reservation[] = data.map((r: any) => ({
            id: r.id,
            userId: r.user_id,
            userName: r.user_name,
            jetName: r.jet_name || r.jetName || '',
            date: r.date,
            time: r.time,
            route: r.route,
            status: r.status as JetStatus,
            photos: r.photos || [],
        }));

        return { reservations, error: null };
    } catch (err: any) {
        console.error('Unexpected error fetching all reservations:', err);
        return { reservations: [], error: err.message };
    }
}

// Create reservation
export async function createReservation(
    userId: string,
    userName: string,
    date: string,
    time: string,
    route: string,
    jetName?: string
): Promise<{ reservation: Reservation | null; error: string | null }> {
    try {
        const { data, error } = await supabase
            .from('reservations')
            .insert([
                {
                    user_id: userId,
                    user_name: userName,
                    date,
                    time,
                    route,
                    jet_name: jetName || '',
                    status: JetStatus.IN_DOCK,
                    photos: [],
                },
            ])
            .select()
            .single();

        if (error) {
            console.error('Error creating reservation:', error);
            return { reservation: null, error: error.message };
        }

        const reservation: Reservation = {
            id: data.id,
            userId: data.user_id,
            userName: data.user_name,
            jetName: data.jet_name || data.jetName || '',
            date: data.date,
            time: data.time,
            route: data.route,
            status: data.status as JetStatus,
            photos: data.photos || [],
        };

        return { reservation, error: null };
    } catch (err: any) {
        console.error('Unexpected error creating reservation:', err);
        return { reservation: null, error: err.message };
    }
}

// Update reservation
export async function updateReservation(
    reservationId: string,
    updates: Partial<Reservation>
): Promise<{ reservation: Reservation | null; error: string | null }> {
    try {
        const updateData: any = {};

        if (updates.date !== undefined) updateData.date = updates.date;
        if (updates.time !== undefined) updateData.time = updates.time;
        if (updates.route !== undefined) updateData.route = updates.route;
        if (updates.status !== undefined) updateData.status = updates.status;
        if (updates.photos !== undefined) updateData.photos = updates.photos;
        if (updates.jetName !== undefined) updateData.jet_name = updates.jetName;

        const { data, error } = await supabase
            .from('reservations')
            .update(updateData)
            .eq('id', reservationId)
            .select()
            .single();

        if (error) {
            console.error('Error updating reservation:', error);
            return { reservation: null, error: error.message };
        }

        const reservation: Reservation = {
            id: data.id,
            userId: data.user_id,
            userName: data.user_name,
            jetName: data.jet_name || data.jetName || '',
            date: data.date,
            time: data.time,
            route: data.route,
            status: data.status as JetStatus,
            photos: data.photos || [],
        };

        return { reservation, error: null };
    } catch (err: any) {
        console.error('Unexpected error updating reservation:', err);
        return { reservation: null, error: err.message };
    }
}

// Delete reservation
export async function deleteReservation(reservationId: string): Promise<{ success: boolean; error: string | null }> {
    try {
        const { error } = await supabase
            .from('reservations')
            .delete()
            .eq('id', reservationId);

        if (error) {
            console.error('Error deleting reservation:', error);
            return { success: false, error: error.message };
        }

        return { success: true, error: null };
    } catch (err: any) {
        console.error('Unexpected error deleting reservation:', err);
        return { success: false, error: err.message };
    }
}
