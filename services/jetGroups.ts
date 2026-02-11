import { supabase } from '../supabaseClient';
import { JetGroup } from '../types';

// Get all jet groups
export async function getAllJetGroups(): Promise<{ groups: JetGroup[]; error: string | null }> {
    try {
        const { data, error } = await supabase
            .from('jet_groups')
            .select('*')
            .order('jet_name', { ascending: true });

        if (error) {
            console.error('Error fetching jet groups:', error);
            return { groups: [], error: error.message };
        }

        const groups: JetGroup[] = (data || []).map((g: any) => ({
            id: g.id,
            jetName: g.jet_name,
            manufacturer: g.manufacturer,
            model: g.model,
            year: g.year,
            maxCotistas: g.max_cotistas,
            createdAt: g.created_at,
        }));

        return { groups, error: null };
    } catch (err: any) {
        console.error('Unexpected error fetching jet groups:', err);
        return { groups: [], error: err.message };
    }
}

// Get jet group by name
export async function getJetGroupByName(jetName: string): Promise<{ group: JetGroup | null; error: string | null }> {
    try {
        const { data, error } = await supabase
            .from('jet_groups')
            .select('*')
            .eq('jet_name', jetName)
            .single();

        if (error) {
            console.error('Error fetching jet group:', error);
            return { group: null, error: error.message };
        }

        const group: JetGroup = {
            id: data.id,
            jetName: data.jet_name,
            manufacturer: data.manufacturer,
            model: data.model,
            year: data.year,
            maxCotistas: data.max_cotistas,
            createdAt: data.created_at,
        };

        return { group, error: null };
    } catch (err: any) {
        console.error('Unexpected error fetching jet group:', err);
        return { group: null, error: err.message };
    }
}

// Count cotistas in a jet group
export async function countCotistasInGroup(jetGroupId: string): Promise<{ count: number; error: string | null }> {
    try {
        const { count, error } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('jet_group_id', jetGroupId)
            .eq('owner_type', 'COTISTA');

        if (error) {
            console.error('Error counting cotistas:', error);
            return { count: 0, error: error.message };
        }

        return { count: count || 0, error: null };
    } catch (err: any) {
        console.error('Unexpected error counting cotistas:', err);
        return { count: 0, error: err.message };
    }
}
