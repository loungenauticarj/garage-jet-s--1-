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

    const userToDelete = users.find((u) => u.id === userId);
    console.log('[useUserDeletion] Usuário a deletar:', userToDelete?.name);
    
    const { success, error } = await usersService.deleteUser(userId);
    console.log('[useUserDeletion] Resultado da deleção - success:', success, 'error:', error);

    if (error) {
      alert('Erro ao deletar usuário: ' + error);
      return;
    }

    if (success) {
      clearDeletedUserLocalData(userId, userToDelete?.email);

      if (currentUser?.id === userId) {
        onDeletedCurrentUser();
      }

      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setReservations((prev) => prev.filter((r) => r.userId !== userId));
      console.log('[useUserDeletion] Usuário deletado com sucesso');
    }
  }, [users, currentUser, setUsers, setReservations, onDeletedCurrentUser]);

  return { deleteUser };
};
