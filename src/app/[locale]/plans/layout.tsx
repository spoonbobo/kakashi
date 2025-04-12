"use client";

import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import Loading from "@/components/loading";
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from "@/store/store";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Box, Heading, Icon, Container, Text, VStack, Flex, Spinner, Badge, Input, HStack, Button, IconButton } from "@chakra-ui/react";
import { FaTasks, FaSearch } from "react-icons/fa";
import { FiChevronRight, FiChevronLeft } from "react-icons/fi";
import { fetchPlans } from "@/store/features/planSlice";
import { usePlansColors } from "@/utils/colors";
import Link from "next/link";
import { IPlan, PlanStatus } from "@/types/plan";
import StatusBadge, { getStatusColorScheme } from "@/components/ui/StatusBadge";

const MotionBox = motion(Box);

// Use typed dispatch
const useAppDispatch = () => useDispatch<AppDispatch>();

// Format date for display
const formatDate = (date: Date | null): string => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export default function PlansLayout({ children }: { children: React.ReactNode }) {
    const t = useTranslations("Plans");
    const router = useRouter();
    const pathname = usePathname();
    const { data: session } = useSession();
    const dispatch = useAppDispatch();

    const { isAuthenticated, isLoading: userLoading, isOwner } = useSelector(
        (state: RootState) => state.user
    );

    const { plans, loading } = useSelector(
        (state: RootState) => state.plan
    );

    const { currentUser } = useSelector(
        (state: RootState) => state.user
    );

    const colors = usePlansColors();

    // Add state for search, filter, and pagination
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<PlanStatus | "all">("all");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10; // Number of plans per page

    // Fetch plans on component mount
    useEffect(() => {
        if (isAuthenticated) {
            console.log("Fetching plans...");
            dispatch(fetchPlans());
        }
    }, [isAuthenticated, dispatch]);

    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter]);


    useEffect(() => {
        if (!isAuthenticated) {
            router.push("/signin");
        }
    }, [isAuthenticated, router]);

    // // Add this after fetching plans
    // useEffect(() => {
    //     if (plans.length > 0 && currentUser) {
    //         console.log("All plans:", plans);
    //         console.log("User active rooms:", currentUser.active_rooms);

    //         // Check which plans match active rooms
    //         const plansInActiveRooms = plans.filter(plan =>
    //             currentUser.active_rooms?.includes(plan.room_id)
    //         );
    //         console.log("Plans in active rooms:", plansInActiveRooms);

    //         // Check if the specific plan exists
    //         const specificPlan = plans.find(plan =>
    //             plan.plan_id === "2540061f-031f-4050-8061-25f0e07a6600"
    //         );
    //         console.log("Specific plan found:", specificPlan);
    //     }
    // }, [plans, currentUser]);

    if (!isAuthenticated) {
        return null;
    }

    // Show loading state while checking authentication
    if (userLoading || !session) {
        return null;
    }


    // Redirect if not authenticated
    if (!isAuthenticated && !session) {
        return null; // Show loading instead of direct navigation
    }

    // Extract the current plan ID from the pathname
    const currentPlanId = pathname.split('/').pop();
    const isDetailView = pathname !== '/plans' && pathname !== '/plans/';

    // Filter plans based on search query, status filter, and user's active rooms
    const filteredPlans = plans
        .filter((plan: any) => {
            const matchesSearch = plan.plan_overview.toLowerCase().includes(searchQuery.toLowerCase()) ||
                plan.plan_name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === "all" || plan.status === statusFilter;
            const isInActiveRooms = currentUser?.active_rooms?.includes(plan.room_id);
            return matchesSearch && matchesStatus && isInActiveRooms;
        })
        .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    // Calculate pagination
    const totalPages = Math.ceil(filteredPlans.length / itemsPerPage);
    const paginatedPlans = filteredPlans.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Status filter options with their respective colors
    const statusOptions: Array<{ value: PlanStatus | "all", label: string }> = [
        { value: "all", label: "All" },
        { value: "pending", label: "Pending" },
        { value: "running", label: "Running" },
        { value: "success", label: "Success" },
        { value: "failure", label: "Failure" },
        { value: "terminated", label: "Terminated" }
    ];

    return (
        <Container
            maxW="1400px"
            px={{ base: 4, md: 6, lg: 8 }}
            py={4}
            height="calc(100% - 10px)"
            position="relative"
            overflow="hidden"
        >
            <MotionBox
                width="100%"
                height="100%"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                display="flex"
                flexDirection="column"
                overflow="hidden"
                position="relative"
            >
                <Heading size="lg" mb={6} display="flex" alignItems="center" color={colors.textColorHeading}>
                    <Icon as={FaTasks} mr={3} color={colors.accentColor} />
                    {t("plans")}
                </Heading>

                <Flex
                    bg={colors.cardBg}
                    borderRadius="lg"
                    boxShadow={colors.cardShadow}
                    height="calc(100vh - 160px)"
                    borderWidth="1px"
                    borderColor={colors.borderColor}
                    overflow="hidden"
                >
                    {/* Sidebar with plans list */}
                    <Box
                        width="300px"
                        borderRightWidth="1px"
                        borderRightColor={colors.borderColor}
                        overflowY="auto"
                        p={4}
                        display="flex"
                        flexDirection="column"
                        bg={colors.timelineBg}
                    >
                        <Text fontSize="lg" fontWeight="bold" mb={4} color={colors.textColorHeading}>
                            {t("available_plans")} {filteredPlans.length > 0 && `(${filteredPlans.length})`}
                        </Text>

                        {/* Search bar with Chakra UI v3 syntax */}
                        <Flex position="relative" mb={3}>
                            <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" zIndex={1}>
                                <Icon as={FaSearch} color={colors.textColorMuted} />
                            </Box>
                            <Input
                                placeholder={t("search_plans")}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                borderColor={colors.inputBorder}
                                bg={colors.inputBg}
                                _focus={{ borderColor: colors.accentColor, boxShadow: `0 0 0 1px ${colors.focusRingColor}` }}
                                pl={10}
                                size="sm"
                            />
                        </Flex>

                        {/* Status filter */}
                        <Box mb={4} overflowX="auto">
                            <HStack gap={2} py={1}>
                                {statusOptions.map(option => (
                                    <Button
                                        key={option.value}
                                        size="xs"
                                        variant={statusFilter === option.value ? "solid" : "outline"}
                                        onClick={() => setStatusFilter(option.value)}
                                        colorScheme={option.value !== "all" ? getStatusColorScheme(option.value as PlanStatus) : "gray"}
                                        bg={statusFilter === option.value ? undefined : "transparent"}
                                        borderWidth={1}
                                        borderRadius="full"
                                        px={3}
                                        minW="auto"
                                        _hover={{
                                            bg: statusFilter !== option.value ? colors.hoverBg : undefined
                                        }}
                                    >
                                        {option.value !== "all" ? (
                                            <Flex align="center" gap={1}>
                                                <Box
                                                    w={2}
                                                    h={2}
                                                    borderRadius="full"
                                                    bg={`${getStatusColorScheme(option.value as PlanStatus)}.500`}
                                                />
                                                {t(option.value)}
                                            </Flex>
                                        ) : t(option.label)}
                                    </Button>
                                ))}
                            </HStack>
                        </Box>

                        {loading.plans ? (
                            <VStack py={8}>
                                <Spinner size="md" color={colors.accentColor} mb={2} />
                                <Text fontSize="sm" color={colors.textColor}>{t("loading_plans")}</Text>
                            </VStack>
                        ) : filteredPlans.length > 0 ? (
                            <VStack align="stretch" gap={3} flex="1">
                                {paginatedPlans.map((plan: any) => {
                                    // Convert string dates to Date objects
                                    const typedPlan: IPlan = {
                                        ...plan,
                                        created_at: plan.created_at ? new Date(plan.created_at) : new Date(),
                                        updated_at: plan.updated_at ? new Date(plan.updated_at) : new Date(),
                                        completed_at: plan.completed_at ? new Date(plan.completed_at) : null
                                    };

                                    const isSelected = currentPlanId === typedPlan.id;

                                    return (
                                        <Link
                                            href={`/plans/${typedPlan.id}`}
                                            key={typedPlan.id}
                                            style={{ textDecoration: 'none' }}
                                        >
                                            <Box
                                                p={3}
                                                borderWidth="1px"
                                                borderRadius="md"
                                                borderColor={isSelected ? colors.selectedBorder : colors.borderColor}
                                                bg={isSelected ? colors.subtleSelectedItemBg : colors.planItemBg}
                                                cursor="pointer"
                                                _hover={{
                                                    boxShadow: isSelected ? colors.selectedCardShadow : colors.cardShadow,
                                                    borderColor: colors.selectedBorderColor,
                                                    bg: isSelected ? colors.subtleSelectedItemBg : colors.planItemHoverBg
                                                }}
                                                transition="all 0.2s"
                                            >
                                                <Flex justify="space-between" align="center" mb={1}>
                                                    <Text fontWeight="bold" fontSize="md" lineClamp={1} color={colors.textColorHeading}>
                                                        {typedPlan.plan_name.substring(0, 30)}
                                                        {typedPlan.plan_name.length > 30 ? '...' : ''}
                                                    </Text>
                                                    <StatusBadge status={typedPlan.status} size="sm" />
                                                </Flex>
                                                <Flex justify="space-between" align="center">
                                                    <Text fontSize="xs" color={colors.textColorMuted}>
                                                        {t("progress")}: {typedPlan.progress}%
                                                    </Text>
                                                    <Text fontSize="xs" color={colors.textColorMuted}>
                                                        {formatDate(typedPlan.updated_at)}
                                                    </Text>
                                                </Flex>
                                            </Box>
                                        </Link>
                                    );
                                })}
                            </VStack>
                        ) : (
                            <VStack py={8} gap={3}>
                                <Text color={colors.textColorMuted} fontSize="sm" textAlign="center">
                                    {searchQuery || statusFilter !== "all"
                                        ? "No plans match your search criteria"
                                        : t("no_plans_found")}
                                </Text>
                                {(searchQuery || statusFilter !== "all") && (
                                    <Button
                                        size="xs"
                                        variant="outline"
                                        onClick={() => {
                                            setSearchQuery("");
                                            setStatusFilter("all");
                                        }}
                                        borderColor={colors.borderColor}
                                        color={colors.textColor}
                                        _hover={{ bg: colors.hoverBg }}
                                    >
                                        {t("clear_filters")}
                                    </Button>
                                )}
                            </VStack>
                        )}

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <Flex justify="center" mt={4} align="center" borderTopWidth="1px" borderColor={colors.borderColor} pt={3}>
                                <IconButton
                                    aria-label="Previous Page"
                                    size="sm"
                                    colorScheme="blue"
                                    variant="ghost"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    mr={2}
                                    color={colors.accentColor}
                                    _hover={{ bg: colors.hoverBg }}
                                >
                                    <Icon as={FiChevronLeft} />
                                </IconButton>

                                <Text fontSize="sm" mx={2} color={colors.textColorMuted}>
                                    {currentPage} / {totalPages}
                                </Text>

                                <IconButton
                                    aria-label="Next Page"
                                    size="sm"
                                    colorScheme="blue"
                                    variant="ghost"
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    ml={2}
                                    color={colors.accentColor}
                                    _hover={{ bg: colors.hoverBg }}
                                >
                                    <Icon as={FiChevronRight} />
                                </IconButton>
                            </Flex>
                        )}
                    </Box>

                    {/* Main content area */}
                    <Box flex="1" p={0} position="relative" overflowY="auto" bg={colors.detailsBg}>
                        {!isDetailView && !loading.plans ? (
                            <Flex
                                direction="column"
                                align="center"
                                justify="center"
                                height="100%"
                                p={8}
                            >
                                <Icon as={FaTasks} fontSize="6xl" color={colors.accentColor} mb={6} />
                                <Text fontSize="xl" fontWeight="bold" color={colors.textColorHeading} mb={2}>
                                    {t("select_plan")}
                                </Text>
                                <Text color={colors.textColorMuted} textAlign="center" maxW="md">
                                    {t("select_plan_description")}
                                </Text>
                            </Flex>
                        ) : (
                            children
                        )}
                    </Box>
                </Flex>
            </MotionBox>
        </Container>
    );
} 