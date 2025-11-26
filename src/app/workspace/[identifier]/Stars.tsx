import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Rating from '@mui/material/Rating';

interface StarProps {
  rating: number | null;
  setRating: (value: number | null) => void;
}

const Stars: React.FC<StarProps> = ({ rating, setRating }) => {
  return (
    <Box className='bg-gray-800 opacity-70 rounded-lg pt-1 px-1'>
      <Rating
        name="simple-controlled"
        value={rating}
        onChange={(event, newValue) => {
          setRating(newValue);
        }}
      />
    </Box>
  );
};



export default Stars;
