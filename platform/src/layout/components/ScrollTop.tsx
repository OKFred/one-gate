import React, { useEffect, useState } from 'react';
import { Fab, Fade } from '@mui/material';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

const ScrollTopButton: React.FC = () => {
  const [show, setShow] = useState(false);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShow(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Fade in={show}>
      <Fab
        color="primary"
        size="small"
        onClick={handleClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        aria-label="回到顶部"
        sx={{
          position: 'fixed',
          bottom: 128,
          right: 32,
          opacity: hover ? 1 : 0.3,
          transition: 'opacity 0.2s',
          zIndex: 1301,
        }}
      >
        <KeyboardArrowUpIcon />
      </Fab>
    </Fade>
  );
};

export default ScrollTopButton;
