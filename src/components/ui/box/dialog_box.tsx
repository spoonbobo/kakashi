import { Box, Text } from '@chakra-ui/react';

interface DialogBoxProps {
    item: {
        id: string;
        message: string;
    };
}

export const DialogBox = ({ item }: DialogBoxProps) => {
    return (
        <Box 
            key={item.id}
            p={3}
            bg="gray.50"
            borderRadius="md"
            _hover={{ bg: "gray.100" }}
    transition="background 0.2s"
            height={`calc((100%) / 15)`}
            display="flex"
            alignItems="center"
        >
            {typeof item.message === 'string' ? (
                <Text>{item.message}</Text>
            ) : (
                item.message
            )}
        </Box>
    );
};
