import { Dispatch, SetStateAction, useCallback } from 'react';
import * as usersService from '../services/users';
import { User } from '../types';

interface UseUserUpdateParams {
  setUsers: Dispatch<SetStateAction<User[]>>;
}

export const useUserUpdate = ({ setUsers }: UseUserUpdateParams) => {
  const updateUser = useCallback(async (updatedUser: User) => {
    const { user, error } = await usersService.updateUser(updatedUser.id, updatedUser);

    if (error) {
      alert('Erro ao atualizar usuário: ' + error);
      return;
    }

    if (user) {
      setUsers((prev) => prev.map((u) => (u.id === user.id ? user : u)));
    }
  }, [setUsers]);

  return { updateUser };
};
