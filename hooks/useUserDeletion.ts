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
    const confirmed = window.confirm(
      'Tem certeza que deseja excluir este cliente permanentemente? Todas as reservas associadas também serão removidas.'
    );

    if (!confirmed) return;

    const userToDelete = users.find((u) => u.id === userId);
    const { success, error } = await usersService.deleteUser(userId);

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
    }
  }, [users, currentUser, setUsers, setReservations, onDeletedCurrentUser]);

  return { deleteUser };
};
