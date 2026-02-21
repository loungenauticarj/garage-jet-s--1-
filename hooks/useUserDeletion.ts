import { Dispatch, SetStateAction, useCallback } from 'react';
import * as usersService from '../services/users';
import { Reservation, User } from '../types';
import { clearDeletedUserLocalData } from '../utils';

interface UseUserDeletionParams {
  users: User[];
  currentUser: User | null;
  setUsers: Dispatch<SetStateAction<User[]>>;
  setReservations: Dispatch<SetStateAction<Reservation[]>>;
  onDeletedCurrentUser: () => void;
}

export const useUserDeletion = ({
  users,
  currentUser,
  setUsers,
  setReservations,
  onDeletedCurrentUser,
}: UseUserDeletionParams) => {
  const deleteUser = useCallback(async (userId: string) => {
    console.log('[useUserDeletion] Iniciando deleção do usuário:', userId);
    const confirmed = window.confirm(
      'Tem certeza que deseja excluir este cliente permanentemente? Todas as reservas associadas também serão removidas.'
    );

    if (!confirmed) {
      console.log('[useUserDeletion] Deleção cancelada pelo usuário');
      return;
    }

    // Disable auto-refresh during deletion
    if ((window as any).__disableAutoRefresh) {
      (window as any).__disableAutoRefresh();
    }

    const userToDelete = users.find((u) => u.id === userId);
    console.log('[useUserDeletion] Usuário a deletar:', userToDelete?.name, 'ID:', userId);
    
    const { success, error } = await usersService.deleteUser(userId);
    console.log('[useUserDeletion] Resultado da deleção - success:', success, 'error:', error);

    if (error) {
      alert('Erro ao deletar usuário: ' + error);
      return;
    }

    if (success) {
      console.log('[useUserDeletion] Limpando dados locais e atualizando estado...');
      clearDeletedUserLocalData(userId, userToDelete?.email);

      if (currentUser?.id === userId) {
        onDeletedCurrentUser();
      }

      // Remove from local state
      setUsers((prev) => {
        const filtered = prev.filter((u) => u.id !== userId);
        console.log('[useUserDeletion] Usuários após filtro:', filtered.length, 'de', prev.length);
        return filtered;
      });
      setReservations((prev) => prev.filter((r) => r.userId !== userId));
      
      // Force reload data to ensure consistency
      if ((window as any).__forceReloadData) {
        console.log('[useUserDeletion] Forçando recarga de dados do servidor...');
        setTimeout(() => (window as any).__forceReloadData(), 500);
      }
      
      alert('Cliente deletado com sucesso!');
      console.log('[useUserDeletion] Processo de deleção concluído');
    }
  }, [users, currentUser, setUsers, setReservations, onDeletedCurrentUser]);

  return { deleteUser };
};
