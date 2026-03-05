import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/useToast';
import {
  createRestaurant,
  getRestaurants,
  getRestaurantById,
  updateRestaurant,
  deleteRestaurant,
  Restaurant
} from '@/api/restaurant';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Building2, Edit, Eye, Trash2, Plus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function RestaurantManagement() {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    phone: '',
    email: '',
    tableCount: 10,
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: ''
  });

  // Check authentication and fetch restaurants on mount
  useEffect(() => {
    const token = localStorage.getItem('restaurant_token');
    if (!token) {
      toast({
        variant: 'destructive',
        title: 'Authentication Required',
        description: 'Please login to manage restaurants'
      });
      navigate('/restaurant/login');
      return;
    }
    fetchRestaurants();
  }, [navigate]);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const response = await getRestaurants({ myRestaurants: true });
      setRestaurants(response.restaurants);
    } catch (error: any) {
      console.error('Error fetching restaurants:', error.message);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to fetch restaurants'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setLoading(true);
      const data = {
        name: formData.name,
        description: formData.description,
        phone: formData.phone,
        email: formData.email,
        tableCount: formData.tableCount,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: formData.country
        }
      };

      await createRestaurant(data);
      toast({
        title: 'Success',
        description: 'Restaurant created successfully'
      });

      setIsCreateDialogOpen(false);
      resetForm();
      fetchRestaurants();
    } catch (error: any) {
      console.error('Error creating restaurant:', error.message);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to create restaurant'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedRestaurant) return;

    try {
      setLoading(true);
      const data = {
        name: formData.name,
        description: formData.description,
        phone: formData.phone,
        email: formData.email,
        tableCount: formData.tableCount,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: formData.country
        }
      };

      await updateRestaurant(selectedRestaurant._id, data);
      toast({
        title: 'Success',
        description: 'Restaurant updated successfully'
      });

      setIsEditDialogOpen(false);
      setSelectedRestaurant(null);
      resetForm();
      fetchRestaurants();
    } catch (error: any) {
      console.error('Error updating restaurant:', error.message);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update restaurant'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      setLoading(true);
      await deleteRestaurant(id);
      toast({
        title: 'Success',
        description: 'Restaurant deleted successfully'
      });
      fetchRestaurants();
    } catch (error: any) {
      console.error('Error deleting restaurant:', error.message);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete restaurant'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (id: string) => {
    try {
      setLoading(true);
      const response = await getRestaurantById(id);
      setSelectedRestaurant(response.restaurant);
      setIsViewDialogOpen(true);
    } catch (error: any) {
      console.error('Error fetching restaurant:', error.message);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to fetch restaurant details'
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setFormData({
      name: restaurant.name,
      description: restaurant.description || '',
      phone: restaurant.phone || '',
      email: restaurant.email || '',
      tableCount: restaurant.tableCount,
      street: restaurant.address?.street || '',
      city: restaurant.address?.city || '',
      state: restaurant.address?.state || '',
      zipCode: restaurant.address?.zipCode || '',
      country: restaurant.address?.country || ''
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      phone: '',
      email: '',
      tableCount: 10,
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    });
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Restaurant Management</h1>
          <p className="text-muted-foreground">Manage your restaurants</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Restaurant
        </Button>
      </div>

      {loading && restaurants.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading restaurants...</p>
        </div>
      ) : restaurants.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No restaurants found. Click "Add Restaurant" to create your first restaurant.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((restaurant) => (
            <Card key={restaurant._id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{restaurant.name}</CardTitle>
                  </div>
                </div>
                <CardDescription>
                  {restaurant.description || 'No description'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tables:</span>
                    <span className="font-medium">{restaurant.tableCount}</span>
                  </div>
                  {restaurant.phone && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone:</span>
                      <span className="font-medium">{restaurant.phone}</span>
                    </div>
                  )}
                  {restaurant.address?.city && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Location:</span>
                      <span className="font-medium">
                        {restaurant.address.city}
                        {restaurant.address.state && `, ${restaurant.address.state}`}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleView(restaurant._id)}
                  >
                    <Eye className="mr-1 h-4 w-4" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openEditDialog(restaurant)}
                  >
                    <Edit className="mr-1 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(restaurant._id, restaurant.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Restaurant</DialogTitle>
            <DialogDescription>
              Add a new restaurant to your account
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Restaurant Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter restaurant name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1-234-567-8900"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="info@restaurant.com"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tableCount">Table Count</Label>
              <Input
                id="tableCount"
                type="number"
                min="1"
                max="100"
                value={formData.tableCount}
                onChange={(e) => setFormData({ ...formData, tableCount: parseInt(e.target.value) })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="street">Street Address</Label>
              <Input
                id="street"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                placeholder="123 Main Street"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="New York"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="NY"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="zipCode">Zip Code</Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  placeholder="10001"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="USA"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateDialogOpen(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!formData.name || loading}>
              {loading ? 'Creating...' : 'Create Restaurant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Restaurant</DialogTitle>
            <DialogDescription>
              Update restaurant information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Restaurant Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter restaurant name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1-234-567-8900"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="info@restaurant.com"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-tableCount">Table Count</Label>
              <Input
                id="edit-tableCount"
                type="number"
                min="1"
                max="100"
                value={formData.tableCount}
                onChange={(e) => setFormData({ ...formData, tableCount: parseInt(e.target.value) })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-street">Street Address</Label>
              <Input
                id="edit-street"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                placeholder="123 Main Street"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-city">City</Label>
                <Input
                  id="edit-city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="New York"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-state">State</Label>
                <Input
                  id="edit-state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="NY"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-zipCode">Zip Code</Label>
                <Input
                  id="edit-zipCode"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  placeholder="10001"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-country">Country</Label>
                <Input
                  id="edit-country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="USA"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditDialogOpen(false);
              setSelectedRestaurant(null);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={!formData.name || loading}>
              {loading ? 'Updating...' : 'Update Restaurant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Restaurant Details</DialogTitle>
            <DialogDescription>
              View complete restaurant information
            </DialogDescription>
          </DialogHeader>
          {selectedRestaurant && (
            <div className="grid gap-4 py-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">{selectedRestaurant.name}</h3>
                <p className="text-muted-foreground">{selectedRestaurant.description || 'No description'}</p>
              </div>
              <div className="grid gap-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID:</span>
                  <span className="font-mono text-sm">{selectedRestaurant._id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Table Count:</span>
                  <span className="font-medium">{selectedRestaurant.tableCount}</span>
                </div>
                {selectedRestaurant.phone && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="font-medium">{selectedRestaurant.phone}</span>
                  </div>
                )}
                {selectedRestaurant.email && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium">{selectedRestaurant.email}</span>
                  </div>
                )}
                {selectedRestaurant.address && (
                  <div>
                    <span className="text-muted-foreground">Address:</span>
                    <div className="ml-4 mt-1">
                      {selectedRestaurant.address.street && <p>{selectedRestaurant.address.street}</p>}
                      {(selectedRestaurant.address.city || selectedRestaurant.address.state) && (
                        <p>
                          {selectedRestaurant.address.city}
                          {selectedRestaurant.address.state && `, ${selectedRestaurant.address.state}`}
                          {selectedRestaurant.address.zipCode && ` ${selectedRestaurant.address.zipCode}`}
                        </p>
                      )}
                      {selectedRestaurant.address.country && <p>{selectedRestaurant.address.country}</p>}
                    </div>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className={`font-medium ${selectedRestaurant.isActive ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedRestaurant.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span className="font-medium">
                    {new Date(selectedRestaurant.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => {
              setIsViewDialogOpen(false);
              setSelectedRestaurant(null);
            }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
