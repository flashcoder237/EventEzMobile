/**
 * useFeedback — le canal discret et l'echelle de gravite.
 *
 * Regression : l'app ne disposait que de la modale bloquante (~520 appels) et
 * d'un unique toast reserve aux notifications push. Un « message copie » et un
 * « paiement refuse » ouvraient le meme sheet plein ecran.
 */
import React from 'react';
import { Text, Pressable } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';

const mockShowToast = jest.fn();
const mockShowError = jest.fn();
const mockShowConfirm = jest.fn();

jest.mock('../InAppToastContext', () => ({
  useInAppToast: () => ({ showToast: mockShowToast, dismiss: jest.fn(), dismissAll: jest.fn() }),
}));
jest.mock('../AlertContext', () => ({
  useAlert: () => ({
    showAlert: jest.fn(),
    showError: mockShowError,
    showWarning: jest.fn(),
    showSuccess: jest.fn(),
    showConfirm: mockShowConfirm,
  }),
}));

import { useFeedback } from '../FeedbackContext';

function Probe({ action }: { action: (f: ReturnType<typeof useFeedback>) => void }) {
  const fb = useFeedback();
  return (
    <Pressable onPress={() => action(fb)}>
      <Text>go</Text>
    </Pressable>
  );
}

const fire = (action: (f: ReturnType<typeof useFeedback>) => void) => {
  const { getByText } = render(<Probe action={action} />);
  fireEvent.press(getByText('go'));
};

describe('useFeedback — canal discret', () => {
  beforeEach(() => {
    mockShowToast.mockClear();
    mockShowError.mockClear();
    mockShowConfirm.mockClear();
  });

  it('toastSuccess passe par le toast, jamais par la modale', () => {
    fire((f) => f.toastSuccess('Copié'));
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Copié', icon: 'success' }),
    );
    expect(mockShowError).not.toHaveBeenCalled();
  });

  it("ancre les retours d'action en bas, pres du pouce qui vient d'agir", () => {
    fire((f) => f.toastSuccess('Enregistré'));
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({ anchor: 'bottom' }),
    );
  });

  it('toastError reste non bloquant (icone error, pas de modale)', () => {
    fire((f) => f.toastError('Impossible de suivre'));
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Impossible de suivre', icon: 'error' }),
    );
    expect(mockShowError).not.toHaveBeenCalled();
  });

  it("distingue les gravites par l'icone", () => {
    fire((f) => f.toastWarning('Attention'));
    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ icon: 'warning' }));
    mockShowToast.mockClear();
    fire((f) => f.toastInfo('Info'));
    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ icon: 'info' }));
  });

  it('expose toujours la modale pour les interruptions legitimes', () => {
    // Une confirmation destructive DOIT rester bloquante.
    fire((f) => f.showConfirm('Supprimer ?', 'Irreversible', () => {}));
    expect(mockShowConfirm).toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
  });
});
