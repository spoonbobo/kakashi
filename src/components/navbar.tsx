"use client";

import React from "react";
import { Link, Box, Icon, useBreakpointValue } from "@chakra-ui/react";
import { useTranslations } from "next-intl";
import { useSession, signOut } from "next-auth/react";
import {
  FaTasks,
  FaComment,
  FaBook,
  FaChartLine,
  FaCog,
  FaSignOutAlt,
  FaSignInAlt,
} from "react-icons/fa";
import { toaster } from "./ui/toaster";

const NavBar = ({ onExpansionChange }: { onExpansionChange?: (expanded: boolean) => void }) => {
  const isMobile = useBreakpointValue({ base: true, md: false });
  const [isExpanded, setIsExpanded] = React.useState(false);

  const handleMouseEnter = () => {
    setIsExpanded(true);
    if (onExpansionChange) onExpansionChange(true);
  };

  const handleMouseLeave = () => {
    setIsExpanded(false);
    if (onExpansionChange) onExpansionChange(false);
  };

  return (
    <NavBarContainer 
      isMobile={isMobile} 
      isExpanded={isExpanded}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <MenuLinks isMobile={isMobile} isExpanded={isExpanded} />
    </NavBarContainer>
  );
};

const NavBarContainer = ({
  children,
  isMobile,
  isExpanded,
  onMouseEnter,
  onMouseLeave,
}: {
  children: React.ReactNode;
  isMobile?: boolean;
  isExpanded: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) => {
  return (
    <div
      className={`
        fixed top-0 left-0 z-10 flex flex-col items-center justify-start
        ${isExpanded ? 'w-[260px]' : 'w-[60px]'}
        ${isMobile ? 'h-auto' : 'h-screen'}
        px-3 py-4 bg-white/95 backdrop-blur-xl
        shadow-[0_3px_20px_rgba(0,0,0,0.06)]
        border-r border-gray-100
        ${isMobile ? 'border-b' : ''}
        transition-all duration-400 ease-out
        overflow-hidden
      `}
      style={{
        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        transitionDelay: "0.1s"
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
};

const MenuItem = ({
  children,
  to = "/",
  onClick,
  ...rest
}: {
  children: React.ReactNode;
  to?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}) => {
  return (
    <Link href={to} onClick={onClick}>
      <Box display="block" {...rest}>
        {children}
      </Box>
    </Link>
  );
};

const NavIconButton = ({
  to,
  icon,
  label,
  tooltipContent,
  onClick,
  color,
  disabled = false,
  isMobile,
  isExpanded,
  mb,
}: {
  to?: string;
  icon: React.ElementType | (() => React.ReactNode);
  label: string;
  tooltipContent: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  color?: string;
  disabled?: boolean;
  isMobile?: boolean;
  isExpanded?: boolean;
  mb?: number | string;
}) => {
  const t = useTranslations("Navbar");
  
  return (
    <div className={`relative w-full ${mb ? `mb-${mb}` : 'mb-12'}`}>
      {!isExpanded && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[110%] bg-gray-800 text-white text-xs px-3 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-10 shadow-lg">
          {tooltipContent}
        </div>
      )}
      
      <button
        className={`
          group flex items-center w-full p-3 rounded-xl transition-all duration-300 ease-in-out focus:outline-none
          ${disabled 
            ? 'cursor-not-allowed opacity-50 text-gray-300' 
            : `cursor-pointer ${color ? `text-${color}` : 'text-gray-600'} hover:bg-gray-50 hover:scale-105 hover:shadow-md active:bg-gray-100 active:scale-95`}
        `}
        onClick={disabled ? undefined : onClick}
      >
        <Link
          href={disabled ? "#" : to || "#"}
          onClick={disabled ? (e) => e.preventDefault() : undefined}
          className={`flex items-center w-full ${disabled ? 'pointer-events-none' : ''}`}
        >
          <div className="w-14 h-14 flex justify-center items-center flex-shrink-0 rounded-full hover:bg-blue-50 transition-all duration-200">
            {typeof icon === 'function' ? 
              // @ts-ignore
              icon() : 
              <span className="text-2xl transition-all duration-300 group-hover:text-blue-500">
                <Icon as={icon} boxSize={7} />
              </span>
            }
          </div>
          
          <div className={`
            relative ml-4 h-6 overflow-hidden transition-all duration-500 ease-in-out
            ${isExpanded ? 'w-[120px]' : 'w-0'}
          `}>
            <div 
              className={`
                absolute top-0 left-0 font-medium whitespace-nowrap
                transition-all duration-500 ease-in-out
                ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}
              `}
              style={{
                transitionDelay: isExpanded ? '0.2s' : '0s'
              }}
            >
              <span className="relative inline-block after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-full after:h-[2px] after:bg-blue-500 after:opacity-0 after:transition-all after:duration-300 after:origin-left after:scale-x-0 group-hover:after:scale-x-100 group-hover:after:opacity-100 group-hover:text-blue-600">
                {t(label.toLowerCase())}
              </span>
            </div>
          </div>
        </Link>
      </button>
    </div>
  );
};

const MenuLinks = ({ isMobile, isExpanded }: { isMobile?: boolean; isExpanded?: boolean }) => {
  const t = useTranslations("Navbar");
  const { data: session, status } = useSession();
  const isLoggedIn = !!session;

  return (
    <div className="flex flex-col items-center w-full h-full">
      {/* Top section with logo and main nav */}
      <div className="flex flex-col w-full items-center mt-4">
        {/* Logo section - always visible */}
        <NavIconButton
          to="/"
          icon={() => (
            <div
              className="w-10 h-10 bg-blue-500 rounded-md flex items-center justify-center text-white font-bold shadow-md shadow-blue-200 transition-all duration-300 ease-in-out hover:scale-110 hover:shadow-lg active:scale-95"
            >
              K
            </div>
          )}
          label="Kakashi"
          tooltipContent={t("kakashi")}
          isMobile={isMobile}
          isExpanded={isExpanded}
          mb={10}
        />

        {/* Main navigation - always visible */}
        <div className="flex flex-col w-full items-center">
          <NavIconButton
            to="/chat"
            icon={FaComment}
            label="Chat"
            tooltipContent={t("chat")}
            isMobile={isMobile}
            disabled={!isLoggedIn}
            isExpanded={isExpanded}
          />

          <NavIconButton
            to="/tasks"
            icon={FaTasks}
            label="Tasks"
            tooltipContent={t("tasks")}
            isMobile={isMobile}
            disabled={!isLoggedIn}
            isExpanded={isExpanded}
          />

          <NavIconButton
            to="/dashboard"
            icon={FaChartLine}
            label="Dashboard"
            tooltipContent={t("dashboard")}
            isMobile={isMobile}
            disabled={!isLoggedIn}
            isExpanded={isExpanded}
          />

          <NavIconButton
            to="/learn"
            icon={FaBook}
            label="Learn"
            tooltipContent={t("learn")}
            isMobile={isMobile}
            disabled={!isLoggedIn}
            isExpanded={isExpanded}
          />
        </div>
      </div>

      {/* Bottom section with settings and sign out - always visible */}
      <div className="flex flex-col w-full mt-auto mb-4 items-center">
        <NavIconButton
          to="/settings"
          icon={FaCog}
          label="Settings"
          tooltipContent={t("settings")}
          isMobile={isMobile}
          disabled={!isLoggedIn}
          isExpanded={isExpanded}
        />

        <NavIconButton
          to={isLoggedIn ? "#" : "/signin"}
          icon={isLoggedIn ? FaSignOutAlt : FaSignInAlt}
          label={isLoggedIn ? "Sign_Out" : "Sign_In"}
          color={isLoggedIn ? "red.500" : "blue.500"}
          tooltipContent={isLoggedIn ? t("signout") : t("signin")}
          isMobile={isMobile}
          isExpanded={isExpanded}
          onClick={
            isLoggedIn
              ? (e) => {
                  e.preventDefault();
                  signOut({ callbackUrl: "/" });
                  toaster.create({
                    title: t("signout_success"),
                    description: t("signout_success_description"),
                  });
                }
              : undefined
          }
        />
      </div>
    </div>
  );
};

export default NavBar;
