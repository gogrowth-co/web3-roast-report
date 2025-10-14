import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/hooks/useSession';
import { useRoasts } from '@/hooks/useRoasts';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { SearchAndFilter } from '@/components/dashboard/SearchAndFilter';
import { RoastCard } from '@/components/dashboard/RoastCard';
import { NewRoastDialog } from '@/components/dashboard/NewRoastDialog';
import { DeleteRoastDialog } from '@/components/dashboard/DeleteRoastDialog';
import SEO from '@/components/SEO';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Loader2, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

const ROASTS_PER_PAGE = 9;

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: sessionLoading } = useSession();
  const { roasts, isLoading, deleteRoast } = useRoasts(user?.id);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roastToDelete, setRoastToDelete] = useState<{ id: string; url: string } | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!sessionLoading && !user) {
      navigate('/auth');
    }
  }, [user, sessionLoading, navigate]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page on search
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter and sort roasts
  const filteredAndSortedRoasts = useMemo(() => {
    let filtered = [...roasts];

    // Apply search filter
    if (debouncedSearch) {
      filtered = filtered.filter((roast) =>
        roast.url.toLowerCase().includes(debouncedSearch.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((roast) => roast.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'highest':
          return (b.score || 0) - (a.score || 0);
        case 'lowest':
          return (a.score || 0) - (b.score || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [roasts, debouncedSearch, statusFilter, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedRoasts.length / ROASTS_PER_PAGE);
  const paginatedRoasts = filteredAndSortedRoasts.slice(
    (currentPage - 1) * ROASTS_PER_PAGE,
    currentPage * ROASTS_PER_PAGE
  );

  const handleDeleteClick = (id: string, url: string) => {
    setRoastToDelete({ id, url });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (roastToDelete) {
      deleteRoast(roastToDelete.id);
      setDeleteDialogOpen(false);
      setRoastToDelete(null);
    }
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <SEO
        title="Dashboard - Web3 ROAST"
        description="Manage all your Web3 project roasts and analyses in one place"
      />
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        
        <main className="flex-1 container mx-auto px-4 pt-24 sm:pt-32 pb-8 max-w-7xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8">
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Your Roasts</h1>
              <p className="text-muted-foreground">
                Manage and track all your Web3 project analyses
              </p>
            </div>
            <div className="w-full sm:w-auto">
              <NewRoastDialog />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : roasts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Flame className="w-20 h-20 text-muted-foreground mb-6" />
              <h2 className="text-2xl font-semibold text-foreground mb-2">No roasts yet</h2>
              <p className="text-muted-foreground mb-6 max-w-md">
                Start analyzing Web3 projects by creating your first roast
              </p>
              <NewRoastDialog />
            </div>
          ) : (
            <>
              <DashboardStats roasts={roasts} />

              <SearchAndFilter
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                sortBy={sortBy}
                onSortChange={setSortBy}
                resultCount={filteredAndSortedRoasts.length}
                totalCount={roasts.length}
              />

              {filteredAndSortedRoasts.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-muted-foreground text-lg">No roasts match your filters</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                      setSortBy('newest');
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {paginatedRoasts.map((roast) => (
                      <RoastCard
                        key={roast.id}
                        roast={roast}
                        onDelete={(id) => handleDeleteClick(id, roast.url)}
                      />
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            className={
                              currentPage === 1
                                ? 'pointer-events-none opacity-50'
                                : 'cursor-pointer'
                            }
                          />
                        </PaginationItem>

                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer min-w-[44px] min-h-[44px]"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}

                        <PaginationItem>
                          <PaginationNext
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            className={
                              currentPage === totalPages
                                ? 'pointer-events-none opacity-50'
                                : 'cursor-pointer'
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </>
              )}
            </>
          )}
        </main>

        <Footer />
      </div>

      <DeleteRoastDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        roastUrl={roastToDelete?.url || ''}
      />
    </>
  );
}
