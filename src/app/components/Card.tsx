import React from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

interface CardProps {
  title: string;
  description: string;
  icon: IconDefinition;
}

function Card({ title, description, icon }: CardProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl p-[1px] max-w-screen-sm m-auto mt-4 w-fit">
      {/* Animated border gradient - same as MagicButton */}
      <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
      
      {/* Card content - needs backdrop to cover the gradient */}
      <div className="relative md:h-80 bg-slate-950 w-96 md:w-[30rem] p-14 flex flex-col gap-4 rounded-3xl shadow-md backdrop-blur-3xl">
        <div className="flex justify-center items-center gap-8 translate-x-2">
          <FontAwesomeIcon icon={icon} size="2xl" className="scale-150"/> 
          <p style={{ fontFamily: " 'Cinzel Variable', serif" }} className="text-2xl md:text-3xl text-gray-200">{title}</p>
        </div>
        <p className="text-sm md:text-base manrope text-[#ccc]">
          {description}
        </p>
      </div>
    </div>
  );
}

export default Card;