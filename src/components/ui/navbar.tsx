import { Box, HStack, Link, Text, Icon, Flex } from '@chakra-ui/react';
import { FaCog, FaComment, FaCheck , FaTasks } from 'react-icons/fa';
import { AuthPopover } from './popover/auth_popover';
import { useAuth } from '@/auth/context';
import { SimplePopover } from './popover/simple_popover';

export default function Navbar() {
    const { isAuthenticated } = useAuth();
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
            <Flex align="center">
                <Text fontSize="2xl" fontWeight="bold">
                    Kakashi
                </Text>
            </Flex>

            <HStack>
                <NavItem icon={FaComment} href="#">
                    <SimplePopover title="History" />
                </NavItem>
                <NavItem icon={FaTasks} href="#">
                    <SimplePopover title="Tasks" />
                </NavItem>
                <NavItem icon={FaCheck} href="#">
                    <SimplePopover title="Approval" />
                </NavItem>
            </HStack>

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
            _hover={{ textDecoration: 'none', bg: 'transparent' }}
            p={2}
            borderRadius="md"
            bg={isActive ? 'white' : 'transparent'}
            display="flex"
            alignItems="center"
        >
            <Icon as={icon} mr={2} />
            <Text as="span" fontSize="md">{children}</Text>
        </Link>
    );
}