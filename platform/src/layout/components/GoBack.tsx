import React from 'react';
import { Fab, Fade } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const BackToPrevButton: React.FC = () => {
  const [hover, setHover] = React.useState(false);
  const handleClick = () => {
    window.history.back();
  };

  return (
    <Fade in={true}>
      <Fab
        color="default"
        size="small"
        onClick={handleClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        aria-label="返回上一页"
        sx={{
          position: 'fixed',
          bottom: 70,
          right: 32,
          opacity: hover ? 1 : 0.3,
          transition: 'opacity 0.2s',
          zIndex: 1301,
        }}
      >
        <ArrowBackIcon sx={{ color: '#666' }} />
      </Fab>
    </Fade>
  );
};

export default BackToPrevButton;
