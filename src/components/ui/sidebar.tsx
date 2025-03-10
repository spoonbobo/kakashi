import { Box, VStack, Link, Text, Icon, Flex } from '@chakra-ui/react';
import {
    FaHome,
    FaInfoCircle,
    FaEnvelope,
    FaCog,
    FaChartLine,
    FaUsers,
    FaFileAlt,
    FaSignOutAlt
} from 'react-icons/fa';

export default function Sidebar() {
    return (
        <Box
            as="nav"
            position="fixed"
            left={0}
            top={0}
            w="280px"
            h="100vh"
            bg="rgba(29, 78, 216, 0.8)"
            color="white"
            p={6}
            boxShadow="xl"
            display="flex"
            flexDirection="column"
        >
            {/* Logo Section */}
            <Flex align="center" mb={8}>
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

            {/* User Profile Section */}
            <Flex align="center" mb={8} p={3} bg="blue.700" borderRadius="md">
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
                <Box>
                    <Text fontWeight="medium">John Doe</Text>
                    <Text fontSize="sm" color="blue.200">Admin</Text>
                </Box>
            </Flex>

            {/* Main Navigation */}
            <VStack align="stretch" spacing={3} flex={1}>
                <Text fontSize="sm" color="blue.300" fontWeight="medium" mb={2}>MAIN</Text>
                <NavItem icon={FaHome} href="#" isActive>
                    Chat
                </NavItem>

                {/* Divider replacement */}
                <Box my={4} borderBottom="1px" borderColor="blue.600" />

                <Text fontSize="sm" color="blue.300" fontWeight="medium" mb={2}>SETTINGS</Text>
                <NavItem icon={FaCog} href="#">
                    Settings
                </NavItem>
            </VStack>

            {/* Footer Section */}
            <Box mt={4}>
                <NavItem icon={FaSignOutAlt} href="#">
                    Logout
                </NavItem>
                <Text fontSize="xs" color="blue.300" mt={4} textAlign="center">
                    © 2023 MyApp. All rights reserved.
                </Text>
            </Box>
        </Box>
    );
}

// Reusable NavItem component
function NavItem({ icon, href, children, isActive = false }) {
    return (
        <Link
            href={href}
            _hover={{ textDecoration: 'none', bg: 'blue.700' }}
            p={3}
            borderRadius="md"
            bg={isActive ? 'blue.700' : 'transparent'}
            display="flex"
            alignItems="center"
        >
            <Icon as={icon} mr={3} />
            <Text as="span" fontSize="md">{children}</Text>
        </Link>
    );
} 