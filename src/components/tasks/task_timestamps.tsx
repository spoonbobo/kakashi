import React from 'react';
import { Box, Text, Flex } from '@chakra-ui/react';

interface TaskTimestampsProps {
    status?: string;
    createdAt: string;
    startTime?: string;
    endTime?: string;
}

export const TaskTimestamps: React.FC<TaskTimestampsProps> = ({
    createdAt,
    startTime,
    endTime
}) => {
    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString();
    };

    return (
        <Box flex="1" minWidth="200px">
            <Text fontSize={{ base: "sm", md: "md" }} color="gray.600" mb={1}>Timestamps</Text>
            <Flex direction="column" gap={1}>
                <Text fontSize={{ base: "sm", md: "md" }}>
                    <Text as="span" fontWeight="medium">Created:</Text> {formatDate(createdAt)}
                </Text>
                <Text fontSize={{ base: "sm", md: "md" }}>
                    <Text as="span" fontWeight="medium">Started:</Text> {formatDate(startTime)}
                </Text>
                <Text fontSize={{ base: "sm", md: "md" }}>
                    <Text as="span" fontWeight="medium">Completed:</Text> {formatDate(endTime)}
                </Text>
            </Flex>
        </Box>
    );
};

export default TaskTimestamps; 