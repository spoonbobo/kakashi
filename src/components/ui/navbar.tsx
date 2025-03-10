import { Box, HStack, Link, Text, Icon, Flex } from '@chakra-ui/react';
import { FaHome, FaCog, FaSignOutAlt } from 'react-icons/fa';

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
                    MyApp
                </Text>
            </Flex>

            {/* Navigation Links */}
            <HStack spacing={6}>
                <NavItem icon={FaHome} href="#" isActive>
                    Chat
                </NavItem>
                <NavItem icon={FaCog} href="#">
                    Settings
                </NavItem>
            </HStack>

            {/* User Profile and Logout */}
            <Flex align="center">
                <Box
                    w="32px"
                    h="32px"
                    bg="blue.500"
                    mr={3}
                    borderRadius="full"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                >
                    <Text fontSize="sm">JD</Text>
                </Box>
                <NavItem icon={FaSignOutAlt} href="#">
                    Logout
                </NavItem>
            </Flex>
        </Box>
    );
}

// Reusable NavItem component
function NavItem({ icon, href, children, isActive = false }) {
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