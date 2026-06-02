import { useState } from 'react';

export function useDeactivationModals() {
  const [roomName, setRoomName] = useState('A1');
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showDeactivationModal, setShowDeactivationModal] = useState(false);
  const [showActivationModal, setShowActivationModal] = useState(false);

  const openDeactivateFlow = (name) => {
    setRoomName(name);
    setShowActivationModal(false);
    setShowWarningModal(true);
  };

  const openActivateFlow = (name) => {
    setRoomName(name);
    setShowWarningModal(false);
    setShowDeactivationModal(false);
    setShowActivationModal(true);
  };

  const openFromSettings = (name = 'A1') => openDeactivateFlow(name);

  const closeWarningModal = () => setShowWarningModal(false);

  const closeDeactivationModal = () => setShowDeactivationModal(false);

  const closeActivationModal = () => setShowActivationModal(false);

  const handleConfirmDeactivation = () => {
    setShowWarningModal(false);
    setShowDeactivationModal(true);
  };

  const closeAll = () => {
    setShowWarningModal(false);
    setShowDeactivationModal(false);
    setShowActivationModal(false);
  };

  return {
    roomName,
    showWarningModal,
    showDeactivationModal,
    showActivationModal,
    openDeactivateFlow,
    openActivateFlow,
    openFromSettings,
    closeWarningModal,
    closeDeactivationModal,
    closeActivationModal,
    handleConfirmDeactivation,
    closeAll,
  };
}
