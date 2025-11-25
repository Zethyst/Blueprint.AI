"use client";
import React, { useEffect, useState, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { User } from "next-auth";
import Link from "next/link";
import { library } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useRouter } from "next/navigation";
import { usePathname } from 'next/navigation'
import { useMenu } from "@/context/MenuContext";

import {
  faRightFromBracket,
  faRightToBracket,
  faUser,
  faBriefcase,
} from "@fortawesome/free-solid-svg-icons";
library.add(faRightToBracket, faRightFromBracket, faUser, faBriefcase);

// interface NavbarProps {
//   setShowMobileMenu: React.Dispatch<React.SetStateAction<boolean>>;
//   currentPage: string;
//   setCurrentPage: React.Dispatch<React.SetStateAction<string>>;
// }

const Navbar: React.FC = (
  {
    // setShowMobileMenu,
    // currentPage,
    // setCurrentPage,
  }
) => {
  const { data: session, status } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname()
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { showMobileMenu, setShowMobileMenu, currentPage, setCurrentPage } = useMenu();


  const toggleDropdown = () => {
    if (isMobile) {
      router.replace(`/u/${user.username}`)
    }
    else{
      setIsOpen(!isOpen);
    }
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");

    const handleMediaQueryChange = (event:any) => {
      setIsMobile(event.matches);
    };

    // Set initial state
    setIsMobile(mediaQuery.matches);

    // Add event listener
    mediaQuery.addEventListener("change", handleMediaQueryChange);

    // Cleanup event listener on component unmount
    return () => {
      mediaQuery.removeEventListener("change", handleMediaQueryChange);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 0;
      setScrolled(isScrolled);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Handle click outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const scrollToSection = (id: any) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  function capitalizeFirstLetter(str: string): string {
    if (!str) return "";
    return str.charAt(0).toUpperCase();
  }

  const navbarClass = scrolled ? "custom-border" : "";

  if (status === "authenticated") {
    // console.log(session.user.username);
  }

  const user: User = session?.user as User;
  return (
    <div
      className={`sticky  ${navbarClass} bg-[#00000055] top-0 z-50 w-full px-5 md:px-0 py-3 flex justify-between items-center gap-5 backdrop-blur-xl shadow-lg `}
    >
      {/* MOBILE HAMBURGER */}
  
      <div className={`${showMobileMenu?"change":""} pl-2 block md:hidden cursor-pointer`} onClick={()=>setShowMobileMenu(!showMobileMenu)}>
        <div className="bar1 h-1 w-9"></div>
        <div className="bar2 h-1 w-6"></div>
        <div className="bar3 h-1 w-4"></div>
      </div>
      <Link href="/">
        <h2
          style={{ fontFamily: "Robot" }}
          className="hidden md:block text-xl tracking-widest font-semibold cursor-pointer  md:ml-28"
        >
          <span className="font-gradient">Blueprint</span><span className="text-[#0266fdb5]">.AI</span>
        </h2>
      </Link>
      <ul className={`${pathname === "/"?"md:flex":"md:hidden"} hidden justify-center items-center gap-8 font-bold -translate-x-10 `}>
        <li
          onClick={() => scrollToSection("what")}
          className={`nav-item cursor-pointer text-sm text-[#ccc]  hover:text-white`}
        >
          What is SRS?
        </li>
        <li
          onClick={() => scrollToSection("how")}
          className={`nav-item cursor-pointer text-sm text-[#ccc]  hover:text-white`}
        >
          How it works?
        </li>
        <li
          onClick={() => scrollToSection("FAQ")}
          className={`nav-item cursor-pointer text-sm text-[#ccc]  hover:text-white`}
        >
          FAQ
        </li>
        <li
          onClick={() => scrollToSection("contact")}
          className={`nav-item cursor-pointer text-sm text-[#ccc]  hover:text-white `}
        >
          Contact
        </li>
      </ul>
      {status === "loading" ? (
        // Loading skeleton to prevent flash
        <div className="md:mr-28">
          <div className="bg-slate-800 bg-opacity-50 animate-pulse tracking-wide text-transparent font-semibold px-5 py-2 flex justify-center items-center gap-3 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-slate-700"></div>
            <div className="hidden md:block w-20 h-4 bg-slate-700 rounded"></div>
          </div>
        </div>
      ) : status === "authenticated" && session ? (
        <div ref={dropdownRef} className="relative inline-block text-left md:mr-28">
          {/* <span className="mr-4">Welcome, {user?.username || user?.email}</span> */}
          <button
            onClick={toggleDropdown}
            className="bg-transparent md:bg-slate-800 bg-opacity-80 md:hover:bg-slate-900 tracking-wide text-white font-semibold px-5 py-2 flex justify-center items-center gap-3 rounded-xl  "
          >
            {/* <FontAwesomeIcon icon={faRightFromBracket} /> */}
            <div
              className="p-1 h-8 w-8 rounded-full flex justify-center items-center text-lg md:text-base text-black font-bold md:font-semibold"
              style={{
                background:
                  "linear-gradient(62deg, #ae8625 0%, #f3df78 75%, #d2ac47 100%)",
              }}
            >
              { user &&  (user?.username
                ? capitalizeFirstLetter(user.username)
                :  user?.name?.split(" ").map(word => word[0]).join("")) || ""}
            </div>
            <p className="hidden md:block">{user?.username || user?.name || ""}</p>
          </button>
          {isOpen && (
            <div className="absolute left-0 mt-5 w-36 rounded-xl shadow-lg bg-slate-800 bg-opacity-70 overflow-hidden  ">
              <div
                className=""
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="options-menu"
              >
                <Link href={`/u/${user.username?.toString() ? user.username : user.email?.toString()}`} onClick={toggleDropdown}>
                  <button
                    className="block px-4 py-2 text-sm text-gray-300  hover:bg-gray-200 hover:bg-opacity-20 w-full text-left dropdown-item"
                    role="menuitem"
                  >
                    <FontAwesomeIcon icon={faUser} className="mr-2" /> Profile
                  </button>
                </Link>
                <Link href={`/workspace/${user.email}`} onClick={toggleDropdown}>
                  <button
                    className="block px-4 py-2 text-sm text-gray-300  hover:bg-gray-200 hover:bg-opacity-20 w-full text-left dropdown-item"
                    role="menuitem"
                  >
                    <FontAwesomeIcon icon={faBriefcase} className="mr-2" />{" "}
                    Workspace
                  </button>
                </Link>
                <button
                  onClick={() => signOut()}
                  className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-200 hover:bg-opacity-20 w-full text-left dropdown-item"
                  role="menuitem"
                >
                  <FontAwesomeIcon icon={faRightFromBracket} className="mr-2" />{" "}
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <Link href="/sign-in">
          <button className="bg-slate-800 bg-opacity-80 hover:bg-slate-900 tracking-wide text-gray-200 font-semibold px-5 py-2 flex justify-center items-center gap-3 rounded-xl md:mr-28">
            <FontAwesomeIcon icon={faRightToBracket} />
            <p>Login</p>
          </button>
        </Link>
      )}
    </div>
  );
};

export default Navbar;
