import React from 'react';
import { Box, Text, Flex } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

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
    const { t } = useTranslation();
    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString();
    };

    return (
        <Box flex="1" minWidth="200px">
            <Text fontSize={{ base: "sm", md: "md" }} color="gray.600" mb={1}>Timestamps</Text>
            <Flex direction="column" gap={1}>
                <Text fontSize={{ base: "sm", md: "md" }}>
                    <Text as="span" fontWeight="medium">{t('created_at')}:</Text> {formatDate(createdAt)}
                </Text>
                <Text fontSize={{ base: "sm", md: "md" }}>
                    <Text as="span" fontWeight="medium">{t('started_at')}:</Text> {formatDate(startTime)}
                </Text>
                <Text fontSize={{ base: "sm", md: "md" }}>
                    <Text as="span" fontWeight="medium">{t('completed_at')}:</Text> {formatDate(endTime)}
                </Text>
            </Flex>
        </Box>
    );
};

export default TaskTimestamps; 