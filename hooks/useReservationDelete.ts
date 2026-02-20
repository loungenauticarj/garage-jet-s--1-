import { Dispatch, SetStateAction, useCallback } from 'react';
import * as reservationsService from '../services/reservations';
import { Reservation } from '../types';

interface UseReservationDeleteParams {
  setReservations: Dispatch<SetStateAction<Reservation[]>>;
}

export const useReservationDelete = ({
  setReservations,
}: UseReservationDeleteParams) => {
  const deleteReservation = useCallback(async (reservationId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este agendamento?')) return;

    const { success, error } = await reservationsService.deleteReservation(reservationId);

    if (error) {
      alert('Erro ao deletar reserva: ' + error);
      return;
    }

    if (success) {
      setReservations((prev) => prev.filter((r) => r.id !== reservationId));
    }
  }, [setReservations]);

  return { deleteReservation };
};
