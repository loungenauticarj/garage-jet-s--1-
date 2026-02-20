import { Dispatch, SetStateAction, useCallback } from 'react';
import * as reservationsService from '../services/reservations';
import { Reservation, User } from '../types';

interface UseReservationCreateParams {
  currentUser: User | null;
  setReservations: Dispatch<SetStateAction<Reservation[]>>;
}

export const useReservationCreate = ({
  currentUser,
  setReservations,
}: UseReservationCreateParams) => {
  const addReservation = useCallback(async (newRes: Reservation) => {
    if (!currentUser) return;

    const { reservation, error } = await reservationsService.createReservation(
      currentUser.id,
      currentUser.name,
      newRes.date,
      newRes.time,
      newRes.route,
      currentUser.jetName
    );

    if (error) {
      alert('Erro ao criar reserva: ' + error);
      return;
    }

    if (reservation) {
      setReservations((prev) => [...prev, reservation]);
    }
  }, [currentUser, setReservations]);

  return { addReservation };
};
