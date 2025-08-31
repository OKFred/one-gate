import React from 'react';

interface BackToPrevButtonProps {
  style?: React.CSSProperties;
}

const BackToPrevButton: React.FC<BackToPrevButtonProps> = ({ style }) => {
  const handleClick = () => {
    window.history.back();
  };

  return (
    <button
      className="back-to-prev-btn"
      style={style}
      onClick={handleClick}
      aria-label="返回上一页"
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="14" cy="14" r="14" fill="#fff" fillOpacity="0.8" />
        <path
          d="M16.5 9L12 14L16.5 19"
          stroke="#333"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
};

export default BackToPrevButton;
