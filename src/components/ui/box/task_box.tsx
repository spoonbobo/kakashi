import { Box, Text, Badge, Flex } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface TaskBoxProps {
    item: {
        id: string;
        task_executor: string;
        task_description: string;
        task_create_time: string;
        task_start_time: string;
        task_end_time: string;
        task_status: string;
        task_result: string;
    };
    onClick: () => void;
}

const MotionBox = motion(Box);

export const TaskBox = ({ item, onClick }: TaskBoxProps) => {
    const [progress, setProgress] = useState(0);
    const statusColor = {
        completed: 'green',
        in_progress: 'blue',
        pending: 'gray'
    }[item.task_status] || 'gray';

    // Simulate fake progress
    useEffect(() => {
        if (item.task_status === 'in_progress') {
            const interval = setInterval(() => {
                setProgress(prev => (prev < 100 ? prev + Math.random() * 5 : 100));
            }, 1000);
            return () => clearInterval(interval);
        } else if (item.task_status === 'completed') {
            setProgress(100);
        } else {
            setProgress(0);
        }
    }, [item.task_status]);

    return (
        <MotionBox 
            key={item.id}
            p={3}
            borderRadius="md"
            _hover={{ bg: "gray.100" }}
            height="auto"
            display="flex"
            flexDirection="column"
            gap={1}
            position="relative"
            overflow="hidden"
            bg="white"
            boxShadow="md"
            onClick={onClick}
            cursor="pointer"
        >
            {/* Progress bar overlay */}
            <motion.div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${progress}%`,
                    backgroundColor: 'rgba(99, 102, 241, 0.2)',
                    zIndex: -1
                }}
                animate={{
                    width: `${progress}%`
                }}
                transition={{
                    duration: 0.5,
                    ease: 'easeInOut'
                }}
            />

            <Flex justify="space-between" align="center">
                <Text fontWeight="bold">{item.task_executor}</Text>
                <Badge colorScheme={statusColor}>{item.task_status}</Badge>
            </Flex>
            <Text fontSize="sm">{item.task_description}</Text>
            <Box 
                mt={2}
                h="2px"
                bg="blue.200"
                width={`${progress}%`}
                transition="width 0.5s ease"
            />
        </MotionBox>
    );
};
