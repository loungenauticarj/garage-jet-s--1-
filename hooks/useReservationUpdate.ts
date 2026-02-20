import { Dispatch, SetStateAction, useCallback } from 'react';
import * as reservationsService from '../services/reservations';
import { Reservation } from '../types';

interface UseReservationUpdateParams {
  setReservations: Dispatch<SetStateAction<Reservation[]>>;
}

export const useReservationUpdate = ({ setReservations }: UseReservationUpdateParams) => {
  const updateReservation = useCallback(async (updatedRes: Reservation) => {
    const { reservation, error } = await reservationsService.updateReservation(updatedRes.id, updatedRes);

    if (error) {
      alert('Erro ao atualizar reserva: ' + error);
      return;
    }

    if (reservation) {
      setReservations((prev) => prev.map((r) => (r.id === reservation.id ? reservation : r)));
    }
  }, [setReservations]);

  return { updateReservation };
};
