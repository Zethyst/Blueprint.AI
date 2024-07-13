"use client";
import React, { useEffect, useState } from "react";
import { library } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSquareCheck } from "@fortawesome/free-regular-svg-icons";
// import { faSquareCheck } from "@fortawesome/free-solid-svg-icons";
library.add(faSquareCheck);

interface keyProps {
  isMobile: boolean;
  selectedKeys: string[];
  setSelectedKeys: React.Dispatch<React.SetStateAction<string[]>>;
}
function KeyOptions({ isMobile, selectedKeys, setSelectedKeys }: keyProps) {
  const [other, setOther] = useState("");

  function handleClick(option: string) {
    if (selectedKeys.includes(option)) {
      // If option already exists in array, remove it
      setSelectedKeys(selectedKeys.filter((key) => key !== option));
    } else {
      // Else add it to the array
      setSelectedKeys([...selectedKeys, option]);
    }
  }

  const options = [
    "User account management and authentication",
    "Real-time data analytics and reporting tools",
    "Interactive user interface with customizable widgets",
    "Automation of tasks and workflows",
  ];

  useEffect(() => {
    if (other) {
      setSelectedKeys([...selectedKeys, other]);
    }
  }, [other, selectedKeys, setSelectedKeys]);

  return (
    <div className="flex flex-col justify-center items-center md:items-start  gap-4">
      <p
        className="text-xl text-center md:text-left text-gray-300 tracking-wide"
        style={{ fontFamily: " 'Cinzel Variable', serif" }}
      >
        What are the key features that your software will include?
      </p>
      <p className="text-start text-sm md:text-base text-gray-200">
        Please select all that apply:
      </p>
      {options.map((option, index) => (
        <div
          key={index}
          onClick={() => handleClick(option)}
          className={`${
            selectedKeys.includes(option) ? "selected" : "not-selected"
          } bg-[#00000029] hover:bg-[#00000044]  active:translate-x-1 active:translate-y-1 md:active:translate-x-0 md:active:translate-y-0 text-gray-200 text-xs md:text-base cursor-pointer rounded-2xl px-7 py-4 w-96 md:w-[550px] flex justify-between items-center gap-5`}
        >
          <p>{option}</p>
          <div
            className={`${
              selectedKeys.includes(option) ? "hidden" : "bg-[#0000004e] p-[10px] rounded-sm custom-border3"
            } `}
          ></div>
          <FontAwesomeIcon
            icon={faSquareCheck}
            size={`${isMobile ? "2xl" : "xl"}`}
            className={`${
              selectedKeys.includes(option) ? "text-[#0253b9]" : "hidden"
            } `}
          />
        </div>
      ))}
      <div
        className={`${
          other !== "" ? "selected" : "not-selected"
        } bg-[#00000029] text-gray-200 rounded-2xl floating-label px-5 pb-5`}
      >
        <input
          className="bg-transparent py-5  px-3 w-80 md:w-[510px] custom-border2 outline-none poppins-regular"
          type="text"
          placeholder="Other"
          value={other}
          onChange={(e) => setOther(e.target.value)}
          required
        />
      </div>
    </div>
  );
}

export default KeyOptions;
