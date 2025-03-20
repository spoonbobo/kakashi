import React from 'react';
import { Flex } from '@chakra-ui/react';

interface TaskStatusBadgeProps {
    status: string;
    size?: 'sm' | 'md' | 'lg';
}

export const TaskStatusBadge: React.FC<TaskStatusBadgeProps> = ({
    status,
    size = 'md'
}) => {
    // Determine font size based on size prop
    const fontSize = size === 'sm' ? 'xx-small' :
        size === 'md' ? 'xs' : 'sm';

    // Determine padding based on size prop
    const padding = size === 'sm' ? { px: 1.5, py: 0.5 } :
        size === 'md' ? { px: 2, py: 1 } : { px: 3, py: 1.5 };

    return (
        <Flex
            bg={
                status === 'completed' ? 'green.200' :
                    status === 'successful' ? 'teal.100' :
                        status === 'pending' ? 'orange.100' :
                            status === 'approved' ? 'green.50' :
                                status === 'running' ? 'blue.100' :
                                    status === 'denied' ? 'purple.100' :
                                        status === 'failed' ? 'red.100' : 'gray.100'
            }
            color={
                status === 'completed' ? 'green.800' :
                    status === 'successful' ? 'teal.700' :
                        status === 'pending' ? 'orange.700' :
                            status === 'approved' ? 'green.600' :
                                status === 'running' ? 'blue.700' :
                                    status === 'denied' ? 'purple.700' :
                                        status === 'failed' ? 'red.700' : 'gray.700'
            }
            {...padding}
            borderRadius="md"
            justifyContent="center"
            alignItems="center"
            fontWeight="medium"
            fontSize={fontSize}
            textTransform="uppercase"
            mr={1}
            minWidth={size === 'sm' ? '50px' : '70px'}
        >
            {status}
        </Flex>
    );
};

export default TaskStatusBadge;