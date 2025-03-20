import React, { memo, ReactNode } from 'react';
import { Box, Text, Badge, Flex } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { getStatusColorProps } from '@/components/task/task_status_utils';

interface TaskBoxProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    item: any;
    onClick: () => void;
    height?: string;
    isNew?: boolean;
    forceTimeUnderStatus?: boolean;
    preventTextTrimming?: boolean;
    statusBadge?: ReactNode;
}

const MotionBox = motion(Box);
const MotionText = motion(Text);
const MotionBadge = motion(Badge);
const MotionFlex = motion(Flex);

// Memoize the TaskBox component to prevent unnecessary re-renders
export const TaskBox = memo<TaskBoxProps>(({
    item,
    onClick,
    isNew = false,
    forceTimeUnderStatus = false,
    preventTextTrimming = false,
    statusBadge
}) => {
    // Validate task data
    if (!item) {
        console.error('TaskBox received invalid item:', item);
        return null;
    }

    // Use the shared status color utility instead of local function
    const getStatusColor = (status: string) => {
        const colorProps = getStatusColorProps(status);
        return colorProps;
    };

    // Format timestamp to be more compact
    const formatTime = (timestamp: string | Date) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
            ' ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    // Simplified container animation
    const containerVariants = {
        hidden: {
            y: -20,
            opacity: 0,
            scale: 0.95
        },
        visible: {
            y: 0,
            opacity: 1,
            scale: 1,
            transition: {
                type: "spring",
                damping: 14,
                stiffness: 220,
                mass: 1
            }
        }
    };

    // Improved summarization trimming with consistent ellipsis
    const trimSummarization = (text: string) => {
        if (!text) return '';

        const maxLength = preventTextTrimming ? 120 : 80;

        if (text.length > maxLength) {
            return text.substring(0, maxLength - 3) + '...';
        }
        return text;
    };

    // Render the status badge - either use the provided one or create a default
    const renderStatusBadge = () => {
        if (statusBadge) {
            return statusBadge;
        }

        return (
            <MotionBadge
                colorScheme={getStatusColor(item.status).colorScheme}
                fontSize="xs"
                flexShrink={0}
                bg={getStatusColor(item.status).bg}
                color={getStatusColor(item.status).color}
                variant="subtle"
                px={1.5}
                py={0.5}
                borderRadius="md"
            >
                {item.status}
            </MotionBadge>
        );
    };

    return (
        <MotionBox
            p={2.5}
            borderWidth="1px"
            borderRadius="md"
            boxShadow="sm"
            cursor="pointer"
            onClick={onClick}
            height="auto"
            minHeight={preventTextTrimming ? "100px" : "80px"}
            maxHeight={preventTextTrimming ? "140px" : "110px"}
            overflow="hidden"
            display="flex"
            flexDirection="column"
            margin="0"
            mb={2}
            layoutId={item.id}
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            backgroundColor={isNew ? "blue.50" : "white"}
        >
            {forceTimeUnderStatus ? (
                // Layout with time under status
                <>
                    <MotionFlex
                        justify="space-between"
                        align="flex-start"
                        mb={1.5}
                        gap={2}
                    >
                        <MotionText
                            fontWeight="bold"
                            fontSize="sm"
                            flex="1"
                            truncate
                            lineHeight="1.3"
                            css={{
                                display: '-webkit-box',
                                WebkitLineClamp: '2',
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                wordBreak: 'break-word'
                            }}
                        >
                            {trimSummarization(item.summarization)}
                        </MotionText>
                        <Flex
                            direction="column"
                            alignItems="flex-end"
                            flexShrink={0}
                        >
                            {renderStatusBadge()}
                            <MotionText
                                fontSize="2xs"
                                color="gray.500"
                                textAlign="right"
                                whiteSpace="nowrap"
                                mt={1}
                            >
                                {formatTime(item.created_at)}
                            </MotionText>
                        </Flex>
                    </MotionFlex>

                    <MotionText
                        fontSize="xs"
                        color="gray.600"
                        truncate
                        title={item.task_id} // Show full task ID on hover
                    >
                        {item.task_id}
                    </MotionText>
                </>
            ) : (
                // Original layout
                <>
                    <MotionFlex
                        justify="space-between"
                        align="flex-start"
                        mb={1.5}
                        gap={2}
                    >
                        <MotionText
                            fontWeight="bold"
                            fontSize="sm"
                            flex="1"
                            truncate
                            css={{
                                display: '-webkit-box',
                                WebkitLineClamp: '2',
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                wordBreak: 'break-word'
                            }}
                        >
                            {trimSummarization(item.summarization)}
                        </MotionText>
                        {renderStatusBadge()}
                    </MotionFlex>

                    <MotionFlex
                        justify="space-between"
                        align="center"
                        mb={1}
                    >
                        <MotionText
                            fontSize="xs"
                            color="gray.600"
                            maxWidth="50%"
                            truncate
                            title={item.task_id} // Show full task ID on hover
                        >
                            {item.task_id}
                        </MotionText>
                        <MotionText
                            fontSize="2xs"
                            color="gray.500"
                            flexShrink={0}
                            ml={2}
                            whiteSpace="nowrap"
                        >
                            {formatTime(item.created_at)}
                        </MotionText>
                    </MotionFlex>
                </>
            )}
        </MotionBox>
    );
});

// Add display name
TaskBox.displayName = 'TaskBox';
