import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, Coffee, LogOut, UserCog } from "lucide-react";
import MenuCard from "@/components/MenuCard";
import { useCart } from "@/hooks/use-cart";
import { toast } from "sonner";

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  estimated_time: number;
  available: boolean;
  is_special: boolean;
}

interface Order {
  id: string;
  status: string;
  total_price: number;
  created_at: string;
  token_number: number;
}

const Index = () => {
  const navigate = useNavigate();
  const { items } = useCart();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);

      if (session?.user) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id);
        
        setIsAdmin(roles?.some((r) => r.role === "admin") || false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchMenuItems();
    if (user) {
      fetchActiveOrders();
    }
  }, [user]);

  const fetchMenuItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("available", true)
        .order("category", { ascending: true });

      if (error) throw error;
      setMenuItems(data || []);
    } catch (error: any) {
      toast.error("Failed to load menu");
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveOrders = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["queued", "preparing", "ready"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setActiveOrders(data || []);
    } catch (error: any) {
      console.error("Failed to load active orders:", error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    setUser(null);
    setIsAdmin(false);
  };

  const filterByCategory = (category: string) => {
    return menuItems.filter((item) => item.category === category);
  };

  const specialItems = menuItems.filter((item) => item.is_special);

  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "queued": return "bg-status-queued";
      case "preparing": return "bg-status-preparing";
      case "ready": return "bg-status-ready";
      default: return "bg-muted";
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary rounded-full p-2">
              <Coffee className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Annapurna Café</h1>
              <p className="text-xs text-muted-foreground">Campus Cafeteria</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                {isAdmin && (
                  <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
                    <UserCog className="mr-2 h-4 w-4" />
                    Admin
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => navigate("/auth")}>
                Sign In
              </Button>
            )}
            
            <Button
              variant="default"
              size="sm"
              className="relative"
              onClick={() => navigate("/cart")}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Cart
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Active Orders Section */}
        {user && activeOrders.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Your Active Orders</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-card border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/track/${order.id}`)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Token #{order.token_number}</p>
                      <p className="text-lg font-bold">₹{order.total_price}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getStatusColor(order.status)}`}>
                      {order.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                  <p className="text-sm text-primary mt-2">Click to track →</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Today's Specials Section */}
        {specialItems.length > 0 && (
          <div className="mb-8 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-lg p-6 border-2 border-primary/20">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-primary mb-2">⭐ Today's Specials ⭐</h2>
              <p className="text-muted-foreground">Don't miss out on our featured items!</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {specialItems.map((item) => (
                <MenuCard
                  key={item.id}
                  id={item.id}
                  name={item.name}
                  category={item.category}
                  price={item.price}
                  estimatedTime={item.estimated_time}
                  available={item.available}
                />
              ))}
            </div>
          </div>
        )}

        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold mb-2">Today's Menu</h2>
          <p className="text-muted-foreground">Fresh, delicious food made with love</p>
        </div>

        <Tabs defaultValue="breakfast" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="breakfast">Breakfast</TabsTrigger>
            <TabsTrigger value="lunch">Lunch</TabsTrigger>
            <TabsTrigger value="snacks">Snacks</TabsTrigger>
            <TabsTrigger value="beverages">Beverages</TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-pulse">Loading menu...</div>
            </div>
          ) : (
            <>
              {["breakfast", "lunch", "snacks", "beverages"].map((category) => (
                <TabsContent key={category} value={category}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filterByCategory(category).map((item) => (
                      <MenuCard
                        key={item.id}
                        id={item.id}
                        name={item.name}
                        category={item.category}
                        price={item.price}
                        estimatedTime={item.estimated_time}
                        available={item.available}
                      />
                    ))}
                  </div>
                </TabsContent>
              ))}
            </>
          )}
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="bg-background border-t mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Annapurna Café &copy; 2025. Open Mon-Sat, 8 AM - 8 PM</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
