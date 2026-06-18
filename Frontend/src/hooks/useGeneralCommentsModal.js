import { useState } from "react";

const emptyCommentModal = {
  isOpen: false,
  gammeId: null,
  gammeName: "",
  type: null,
  title: "",
};

export const useGeneralCommentsModal = () => {
  const [commentModal, setCommentModal] = useState(emptyCommentModal);

  const openCommentsModal = ({ gammeId, gammeName, type, title }) => {
    setCommentModal({
      isOpen: true,
      gammeId,
      gammeName,
      type,
      title,
    });
  };

  const closeCommentsModal = () => {
    setCommentModal(emptyCommentModal);
  };

  return {
    commentModal,
    openCommentsModal,
    closeCommentsModal,
  };
};
