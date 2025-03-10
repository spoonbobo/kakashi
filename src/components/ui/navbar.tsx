import { Box, HStack, Link, Text, Icon, Flex } from '@chakra-ui/react';
import { FaHome, FaCog, FaSignOutAlt, FaComment } from 'react-icons/fa';
import { AuthPopover } from './popover/auth_popover';
import { useAuth } from '@/auth/context';

export default function Navbar() {

    return (
        <Box
            as="nav"
            position="fixed"
            top={0}
            left={0}
            w="100%"
            bg="rgba(29, 78, 216, 0.8)"
            color="white"
            p={4}
            boxShadow="md"
            display="flex"
            alignItems="center"
            justifyContent="space-between"
        >
            {/* Logo Section */}
            <Flex align="center">
                <Box
                    w="40px"
                    h="40px"
                    bg="blue.500"
                    mr={3}
                    borderRadius="md"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                >
                    <Text fontSize="xl" fontWeight="bold">M</Text>
                </Box>
                <Text fontSize="2xl" fontWeight="bold">
                    Kakashi
                </Text>
            </Flex>

            {/* Navigation Links */}
            <HStack>
                <NavItem icon={FaComment} href="#" isActive>
                    Chat
                </NavItem>
            </HStack>

            {/* User Profile and Logout */}
            <Flex align="center">
                <NavItem icon={FaCog} href="#">
                    Settings
                </NavItem>
                <AuthPopover />
            </Flex>
        </Box>
    );
}

// Reusable NavItem component
function NavItem({ icon, href, children, isActive = false }: { icon: React.ElementType; href: string; children: React.ReactNode; isActive?: boolean }) {
    return (
        <Link
            href={href}
            _hover={{ textDecoration: 'none', bg: 'blue.700' }}
            p={2}
            borderRadius="md"
            bg={isActive ? 'blue.700' : 'transparent'}
            display="flex"
            alignItems="center"
        >
            <Icon as={icon} mr={2} />
            <Text as="span" fontSize="md">{children}</Text>
        </Link>
    );
}