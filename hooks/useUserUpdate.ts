import { Dispatch, SetStateAction, useCallback } from 'react';
import * as usersService from '../services/users';
import { User } from '../types';

interface UseUserUpdateParams {
  users: User[];
  setUsers: Dispatch<SetStateAction<User[]>>;
}

export const useUserUpdate = ({ users, setUsers }: UseUserUpdateParams) => {
  const updateUser = useCallback(async (updatedUser: User): Promise<boolean> => {
    const previousUser = users.find((u) => u.id === updatedUser.id) || null;

    setUsers((prev) =>
      prev.map((u) => (u.id === updatedUser.id ? { ...u, ...updatedUser } : u))
    );

    const { user, error } = await usersService.updateUser(updatedUser.id, updatedUser);

    if (error) {
      if (previousUser) {
        setUsers((prev) => prev.map((u) => (u.id === previousUser.id ? previousUser : u)));
      }
      alert('Erro ao atualizar usuário: ' + error);
      return false;
    }

    if (user) {
      setUsers((prev) => prev.map((u) => (u.id === user.id ? user : u)));
    }
    return true;
  }, [setUsers, users]);

  return { updateUser };
};
