import React from 'react';
import { Box, Text, Badge, Flex } from '@chakra-ui/react';
import { motion } from 'framer-motion';

interface TaskBoxProps {
    item: any;
    onClick: () => void;
    height?: string;
    isNew?: boolean;
}

const MotionBox = motion(Box);
const MotionText = motion(Text);
const MotionBadge = motion(Badge);
const MotionFlex = motion(Flex);

export const TaskBox: React.FC<TaskBoxProps> = ({
    item,
    onClick,
    height = "100px",
    isNew = false
}) => {
    // Validate task data
    if (!item) {
        console.error('TaskBox received invalid item:', item);
        return null;
    }

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed':
                return 'green';
            case 'failed':
                return 'red';
            case 'in_progress':
                return 'blue';
            case 'pending':
            default:
                return 'orange';
        }
    };

    // Format the task description to be more concise
    const formatDescription = (description: string) => {
        if (!description) return 'No description';

        // Remove tool tags
        let text = description.replace(/<tools>.*?<\/tools>/g, '');

        // Limit length
        if (text.length > 100) {
            text = text.substring(0, 97) + '...';
        }

        return text;
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

    return (
        <MotionBox
            p={2.5}
            borderWidth="1px"
            borderRadius="md"
            boxShadow="sm"
            cursor="pointer"
            onClick={onClick}
            height={height}
            minHeight="90px"
            maxHeight="110px"
            overflow="hidden"
            display="flex"
            flexDirection="column"
            margin="0"
            mb={2}
            layoutId={item.id}
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            sx={{
                transition: 'all 0.3s ease',
                _hover: {
                    boxShadow: 'md',
                    borderColor: '#63B3ED', // blue.300 equivalent
                    transform: 'translateY(-2px)'
                },
                ...(isNew ? {
                    boxShadow: "0px 0px 10px 2px rgba(66, 153, 225, 0.5)",
                    borderColor: "rgba(66, 153, 225, 0.8)",
                    backgroundColor: "rgba(235, 248, 255, 0.6)"
                } : {})
            }}
        >
            <MotionFlex
                justify="space-between"
                align="center"
                mb={1.5}
            >
                <MotionText
                    fontWeight="bold"
                    noOfLines={1}
                    maxWidth="70%"
                    fontSize="sm"
                >
                    {item.name || 'Task'}
                </MotionText>
                <MotionBadge
                    colorScheme={getStatusColor(item.task_status)}
                    fontSize="xs"
                >
                    {item.task_status || 'pending'}
                </MotionBadge>
            </MotionFlex>

            <MotionFlex
                justify="space-between"
                align="center"
                mb={1}
            >
                <MotionText
                    fontSize="xs"
                    color="gray.600"
                    noOfLines={1}
                    maxWidth="70%"
                >
                    {item.task_executor}
                </MotionText>
                <MotionText
                    fontSize="2xs"
                    color="gray.500"
                >
                    {formatTime(item.task_create_time)}
                </MotionText>
            </MotionFlex>

            <MotionText
                fontSize="xs"
                noOfLines={2}
                flex="1"
                overflow="hidden"
                textOverflow="ellipsis"
                lineHeight="1.3"
                mt={0.5}
            >
                {formatDescription(item.task_description)}
            </MotionText>
        </MotionBox>
    );
};
