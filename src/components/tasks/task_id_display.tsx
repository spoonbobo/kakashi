import React from 'react';
import { Text, Box } from '@chakra-ui/react';
import { toast } from 'react-toastify';

interface TaskIdDisplayProps {
    taskId: string;
    fontSize?: string;
}

export const TaskIdDisplay: React.FC<TaskIdDisplayProps> = ({
    taskId,
    fontSize = "xs"
}) => {
    const copyToClipboard = () => {
        if (typeof window !== 'undefined') {
            const textArea = document.createElement('textarea');
            textArea.value = taskId;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            toast.info("Task ID copied to clipboard", { autoClose: 2000 });
        }
    };

    return (
        <Box>
            <Text fontSize={fontSize} fontWeight="medium" color="gray.600" mb={1}>TASK ID</Text>
            <Text
                fontSize={fontSize}
                fontFamily="mono"
                color="gray.700"
                wordBreak="break-all"
                cursor="pointer"
                onClick={copyToClipboard}
                title="Click to copy ID"
            >
                {taskId}
            </Text>
        </Box>
    );
};

export default TaskIdDisplay;