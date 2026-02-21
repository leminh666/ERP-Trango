'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { apiClient } from '@/lib/api';
import { useToast } from '@/components/toast-provider';
import { ProductPicker } from '@/components/product-picker';
import { Product, ProductVariant } from '@tran-go-hoang-gia/shared';
import { Plus, Edit, Trash2, Eye, X, Factory, Package, ChevronRight, ChevronDown, Loader2, Percent } from 'lucide-react';

interface OrderItem {
  id: string;
  name: string;
  unit: string;
  qty: number;
  unitPrice: number;
  productId: string | null;
  acceptedQty?: number | null;
  acceptedUnitPrice?: number | null;
  product?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

interface WorkshopJobItem {
  id?: string;
  product: Product | null;
  productId: string | null;
  variantId: string | null;
  name: string;
  unit: string;
  qty: string;
  unitPrice: string;
  source: 'order_item' | 'product_master';
}

interface WorkshopJob {
  id: string;
  code: string;
  title: string | null;
  amount: number;
  discountAmount: number; // Chiết khấu cho phiếu gia công
  paidAmount: number;
  status: string;
  startDate: string | null;
  dueDate: string | null;
  note: string | null;
  workshopId: string;
  workshop: {
    id: string;
    name: string;
  } | null;
  items?: any[];
}

interface WorkOrdersTableProps {
  projectId: string;
  projectCode: string;
  projectName: string;
  workshops: Array<{ id: string; name: string }>;
  orderItems?: OrderItem[]; // Pass order items for prefill
  onEditDiscount?: (job: {
    id: string;
    code: string;
    amount: number;
    discountAmount: number;
  }) => void;
}

export function WorkOrdersTable({
  projectId,
  projectCode,
  projectName,
  workshops,
  orderItems = [],
  onEditDiscount,
}: WorkOrdersTableProps) {
  const router = useRouter();
  const [jobs, setJobs] = useState<WorkshopJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingJob, setEditingJob] = useState<WorkshopJob | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState<WorkshopJob | null>(null);
  const [showDetail, setShowDetail] = useState<WorkshopJob | null>(null);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set());
  const [jobItemsMap, setJobItemsMap] = useState<Record<string, any[]>>({});

  // Edit item state
  const [editingItem, setEditingItem] = useState<{ jobId: string; item: any } | null>(null);
  const [editItemForm, setEditItemForm] = useState({ qty: '', unitPrice: '' });
  const [showDeleteItemConfirm, setShowDeleteItemConfirm] = useState<{ jobId: string; item: any } | null>(null);

  // SL Mapping Modal state
  const [showSLMappingModal, setShowSLMappingModal] = useState(false);
  const [selectedJobForSL, setSelectedJobForSL] = useState<WorkshopJob | null>(null);
  const [slMappingItems, setSLMappingItems] = useState<Array<{
    jobItemId: string;
    productName: string;
    unit: string;
    currentQty: number;
    slnt: number | null;
    newQty: string;
  }>>([]);

  const { showSuccess, showError } = useToast();

  const [form, setForm] = useState({
    workshopId: '',
    title: '',
    note: '',
  });

  const [items, setItems] = useState<WorkshopJobItem[]>([]);

  useEffect(() => {
    fetchJobs();
    fetchProducts();
  }, [projectId]);

  const fetchProducts = async () => {
    try {
      const data = await apiClient<Product[]>('/products?includeDeleted=false');
      const items = Array.isArray(data) ? data : (data as any)?.data || data;
      setProducts(items);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const fetchJobs = async () => {
    try {
      const data = await apiClient<any[]>(`/workshop-jobs?projectId=${projectId}`);
      const formatted = data.map(job => ({
        ...job,
        amount: Number(job.amount || 0),
        paidAmount: Number(job.paidAmount || 0),
      }));
      setJobs(formatted);
    } catch (error) {
      console.error('Failed to fetch workshop jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('vi-VN');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-700';
      case 'SENT': return 'bg-blue-100 text-blue-700';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-700';
      case 'DONE': return 'bg-green-100 text-green-700';
      case 'CANCELLED': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'Nháp';
      case 'SENT': return 'Đã gửi';
      case 'IN_PROGRESS': return 'Đang làm';
      case 'DONE': return 'Hoàn thành';
      case 'CANCELLED': return 'Hủy';
      default: return status;
    }
  };

  // Calculate item total - handle empty values as 0
  const calculateItemAmount = (item: WorkshopJobItem) => {
    const qty = parseFloat(item.qty) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return qty * price;
  };

  // Calculate total from all items
  const calculateTotalAmount = () => {
    return items.reduce((sum, item) => sum + calculateItemAmount(item), 0);
  };

  // Toggle row expansion
  const toggleRow = async (jobId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(jobId)) {
      newExpanded.delete(jobId);
      setExpandedRows(newExpanded);
    } else {
      newExpanded.add(jobId);
      setExpandedRows(newExpanded);
      setExpandedRows(newExpanded);

      // Fetch items if not already loaded
      if (!jobItemsMap[jobId]) {
        setLoadingItems(prev => new Set(prev).add(jobId));
        try {
          const data = await apiClient<any[]>(`/workshop-jobs/${jobId}/items`);
          setJobItemsMap(prev => ({ ...prev, [jobId]: data || [] }));
        } catch (error) {
          console.error('Failed to fetch job items:', error);
        } finally {
          setLoadingItems(prev => {
            const next = new Set(prev);
            next.delete(jobId);
            return next;
          });
        }
      }
    }
  };

  // Add new item row from Product Master
  const addItem = () => {
    setItems([...items, {
      product: null,
      productId: null,
      variantId: null,
      name: '',
      unit: '',
      qty: '0',
      unitPrice: '0',
      source: 'product_master',
    }]);
  };

  // Update item
  const updateItem = (index: number, updates: Partial<WorkshopJobItem>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    setItems(newItems);
  };

  // Remove item
  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // === Edit Item Handlers ===
  const openEditItem = (jobId: string, item: any) => {
    setEditingItem({ jobId, item });
    setEditItemForm({
      qty: item.quantity?.toString() || '0',
      unitPrice: item.unitPrice?.toString() || '0',
    });
  };

  const handleSaveEditItem = async () => {
    if (!editingItem) return;

    try {
      const qty = parseFloat(editItemForm.qty) || 0;
      const unitPrice = parseFloat(editItemForm.unitPrice) || 0;

      await apiClient(`/workshop-jobs/${editingItem.jobId}/items/${editingItem.item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity: qty, unitPrice }),
      });

      showSuccess('Thành công', 'Đã cập nhật sản phẩm');

      // Refresh job items
      const data = await apiClient<any[]>(`/workshop-jobs/${editingItem.jobId}/items`);
      setJobItemsMap(prev => ({ ...prev, [editingItem.jobId]: data || [] }));

      // Refresh job list to update totals
      const jobsData = await apiClient<any[]>(`/workshop-jobs?projectId=${projectId}`);
      const formatted = jobsData.map(job => ({
        ...job,
        amount: Number(job.amount || 0),
        paidAmount: Number(job.paidAmount || 0),
      }));
      setJobs(formatted);

      setEditingItem(null);
    } catch (error) {
      console.error('Failed to update item:', error);
      showError('Lỗi', 'Không thể cập nhật sản phẩm');
    }
  };

  const handleDeleteItem = async () => {
    if (!editingItem) return;

    try {
      await apiClient(`/workshop-jobs/${editingItem.jobId}/items/${editingItem.item.id}`, {
        method: 'DELETE',
      });

      showSuccess('Thành công', 'Đã xóa sản phẩm');

      // Refresh job items
      const data = await apiClient<any[]>(`/workshop-jobs/${editingItem.jobId}/items`);
      setJobItemsMap(prev => ({ ...prev, [editingItem.jobId]: data || [] }));

      // Refresh job list to update totals
      const jobsData = await apiClient<any[]>(`/workshop-jobs?projectId=${projectId}`);
      const formatted = jobsData.map(job => ({
        ...job,
        amount: Number(job.amount || 0),
        paidAmount: Number(job.paidAmount || 0),
      }));
      setJobs(formatted);

      setShowDeleteItemConfirm(null);
    } catch (error) {
      console.error('Failed to delete item:', error);
      showError('Lỗi', 'Không thể xóa sản phẩm');
    }
  };

  // === SL Mapping Handlers ===
  const openSLMappingModal = (job: WorkshopJob) => {
    setSelectedJobForSL(job);
    const jobItems = jobItemsMap[job.id] || [];

    // Build mapping items - match by productId
    const mappingItems = jobItems.map((item: any) => {
      // Find corresponding order item by productId
      const orderItem = orderItems?.find(oi => oi.productId === item.productId);
      return {
        jobItemId: item.id,
        productName: item.productName,
        unit: item.unit,
        currentQty: Number(item.quantity || 0),
        slnt: orderItem ? Number(orderItem.acceptedQty || 0) : null,
        newQty: orderItem ? (orderItem.acceptedQty || 0).toString() : item.quantity?.toString() || '0',
      };
    });

    setSLMappingItems(mappingItems);
    setShowSLMappingModal(true);
  };

  const handleFetchAcceptanceData = () => {
    // Map SLNT from order items to job items
    const mappingItems = slMappingItems.map((item, idx) => {
      // Find corresponding order item by productId
      const orderItem = orderItems?.find(oi => oi.productId === (jobItemsMap[selectedJobForSL?.id || '']?.[idx]?.productId));
      const slnt = orderItem ? Number(orderItem.acceptedQty || 0) : null;
      return {
        ...item,
        slnt,
        newQty: slnt !== null ? slnt.toString() : item.currentQty.toString(),
      };
    });
    setSLMappingItems(mappingItems);
  };

  const handleSaveSLMapping = async () => {
    if (!selectedJobForSL) return;

    try {
      const items = slMappingItems
        .filter(item => parseFloat(item.newQty) !== item.currentQty) // Only update changed items
        .map(item => ({
          id: item.jobItemId,
          quantity: parseFloat(item.newQty) || 0,
        }));

      if (items.length > 0) {
        await apiClient(`/workshop-jobs/${selectedJobForSL.id}/items`, {
          method: 'PUT',
          body: JSON.stringify({ items }),
        });

        showSuccess('Thành công', 'Đã cập nhật số lượng từ dữ liệu nghiệm thu');
      }

      // Refresh job items
      const data = await apiClient<any[]>(`/workshop-jobs/${selectedJobForSL.id}/items`);
      setJobItemsMap(prev => ({ ...prev, [selectedJobForSL.id]: data || [] }));

      // Refresh job list to update totals
      const jobsData = await apiClient<any[]>(`/workshop-jobs?projectId=${projectId}`);
      const formatted = jobsData.map(job => ({
        ...job,
        amount: Number(job.amount || 0),
        paidAmount: Number(job.paidAmount || 0),
      }));
      setJobs(formatted);

      setShowSLMappingModal(false);
    } catch (error) {
      console.error('Failed to update SL mapping:', error);
      showError('Lỗi', 'Không thể cập nhật số lượng');
    }
  };

  // Handle product selection
  const handleSelectProduct = (value: { product: Product | null; variant: ProductVariant | null }) => {
    const { product, variant } = value;
    if (product && editingItemIndex !== null) {
      updateItem(editingItemIndex, {
        product,
        productId: product.id,
        variantId: variant?.id || null,
        name: variant?.name || product.name,
        unit: product.unit,
        unitPrice: variant?.price?.toString() || product.defaultSalePrice?.toString() || '0',
        source: 'product_master',
      });
    }
    setShowProductPicker(false);
    setEditingItemIndex(null);
  };

  const openCreate = () => {
    setEditingJob(null);
    setForm({ workshopId: '', title: '', note: '' });
    
    // Prefill items from order items
    if (orderItems && orderItems.length > 0) {
      setItems(orderItems.map(item => ({
        product: null,
        variantId: null,
        productId: item.productId,
        name: item.product?.name || item.name,
        unit: item.unit,
        qty: '0', // Default quantity = 0 (waiting for acceptance)
        unitPrice: item.unitPrice.toString(),
        source: 'order_item' as const,
      })));
    } else {
      setItems([]);
    }
    
    setShowModal(true);
  };

  const openEdit = (job: WorkshopJob) => {
    setEditingJob(job);
    setForm({
      workshopId: job.workshopId,
      title: job.title || '',
      note: job.note || '',
    });
    // Convert existing items to local state
    setItems((job.items || []).map((item: any) => ({
      id: item.id,
      product: null,
      variantId: null,
      productId: item.productId,
      name: item.productName,
      unit: item.unit,
      qty: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
      source: item.productId ? 'product_master' as const : 'order_item' as const,
    })));
    setShowModal(true);
  };

  const handleSubmit = async () => {
    const errors: string[] = [];
    if (!form.workshopId) errors.push('Xưởng gia công');

    if (errors.length > 0) {
      showError('Thiếu thông tin', 'Vui lòng nhập: ' + errors.join(', '));
      return;
    }

    // Validate items have valid data
    const validItems = items.filter(item => item.name.trim() && item.unit.trim());
    const payloadItems = validItems.map(item => ({
      productId: item.productId || undefined,
      productName: item.name,
      unit: item.unit,
      quantity: parseFloat(item.qty) || 0,
      unitPrice: parseFloat(item.unitPrice) || 0,
    }));

    try {
      if (editingJob) {
        await apiClient(`/workshop-jobs/${editingJob.id}`, {
          method: 'PUT',
          body: {
            workshopId: form.workshopId,
            title: form.title || undefined,
            note: form.note || undefined,
            items: payloadItems,
          },
        });
        showSuccess('Thành công', 'Đã cập nhật phiếu gia công!');
      } else {
        await apiClient('/workshop-jobs', {
          method: 'POST',
          body: {
            projectId,
            workshopId: form.workshopId,
            title: form.title || undefined,
            note: form.note || undefined,
            items: payloadItems,
            startDate: new Date().toISOString(), // Ensure startDate is set for list filtering
          },
        });
        showSuccess('Thành công', 'Đã tạo phiếu gia công mới!');
      }
      setShowModal(false);
      fetchJobs();
    } catch (error: any) {
      console.error('Failed to save:', error);
      showError('Lỗi', error.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (job: WorkshopJob) => {
    try {
      await apiClient(`/workshop-jobs/${job.id}`, { method: 'DELETE' });
      setShowConfirmDelete(null);
      fetchJobs();
      showSuccess('Thành công', 'Đã xóa phiếu gia công');
    } catch (error: any) {
      console.error('Failed to delete:', error);
      showError('Lỗi', error.message || 'Có lỗi xảy ra');
    }
  };

  // Handle row click navigation
  const handleRowClick = (jobId: string) => {
    router.push(`/workshops/jobs/${jobId}`);
  };

  if (loading) {
    return <Card><CardContent className="py-8 text-center">Đang tải...</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Factory className="h-5 w-5 text-orange-600" />
          <span className="font-medium">Phiếu gia công ({jobs.length})</span>
        </div>
        <Button variant="default" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          + Phiếu gia công
        </Button>
      </div>

      {/* Jobs Table - Matching workshops/jobs page style */}
      {jobs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <Factory className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p>Chưa có phiếu gia công nào cho đơn hàng này</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 font-medium">Số phiếu</th>
                    <th className="text-left p-3 font-medium">Xưởng</th>
                    <th className="text-left p-3 font-medium">Ngày</th>
                    <th className="text-right p-3 font-medium">Tổng tiền</th>
                    <th className="text-right p-3 font-medium">Đã TT</th>
                    <th className="text-right p-3 font-medium">Còn nợ</th>
                    <th className="text-left p-3 font-medium">Trạng thái</th>
                    <th className="text-left p-3 font-medium">Ghi chú</th>
                    <th className="text-left p-3 font-medium w-20">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => {
                    const netAmount = Math.max(0, job.amount - (job.discountAmount || 0));
                    const debt = netAmount - job.paidAmount;
                    const isExpanded = expandedRows.has(job.id);
                    const isLoadingItems = loadingItems.has(job.id);
                    const jobItems = jobItemsMap[job.id] || [];

                    return (
                      <React.Fragment key={job.id}>
                        <tr
                          className="border-b cursor-pointer hover:bg-blue-50/50 transition-colors"
                          onClick={() => toggleRow(job.id)}
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-blue-600" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-400" />
                              )}
                              <span className="font-medium text-blue-600">{job.code}</span>
                            </div>
                          </td>
                          <td className="p-3">{job.workshop?.name || '-'}</td>
                          <td className="p-3">{formatDate(job.startDate)}</td>
                          <td className="p-3 text-right">
                            <div className="font-medium">{formatCurrency(netAmount)}</div>
                            {job.discountAmount > 0 && (
                              <div className="text-xs text-orange-600">
                                CK: -{formatCurrency(job.discountAmount)}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-right text-green-600">{formatCurrency(job.paidAmount)}</td>
                          <td className={`p-3 text-right font-medium ${debt > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                            {formatCurrency(debt)}
                          </td>
                          <td className="p-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs ${getStatusColor(job.status)}`}>
                              {getStatusLabel(job.status)}
                            </span>
                          </td>
                          <td className="p-3 text-gray-500 max-w-xs truncate">{job.note || '-'}</td>
                          <td className="p-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              {onEditDiscount && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => { e.stopPropagation(); onEditDiscount?.({ id: job.id, code: job.code, amount: job.amount, discountAmount: job.discountAmount || 0 }); }}
                                  title="Chiết khấu"
                                  className="hover:bg-orange-100"
                                >
                                  <Percent className="h-4 w-4 text-orange-600" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => { e.stopPropagation(); openEdit(job); }}
                                title="Sửa"
                                className="hover:bg-blue-100"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => { e.stopPropagation(); setShowConfirmDelete(job); }}
                                title="Xóa"
                                className="hover:bg-red-100"
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Items Row */}
                        {isExpanded && (
                          <tr className="bg-gray-50/50">
                            <td colSpan={8} className="p-0">
                              <div className="p-4 mx-4 my-2 bg-white border rounded-lg shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-medium text-sm flex items-center gap-2">
                                    <Package className="h-4 w-4 text-gray-500" />
                                    Sản phẩm trong phiếu gia công
                                  </h4>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">
                                      {jobItems.length} hạng mục
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openSLMappingModal(job);
                                      }}
                                      disabled={!orderItems || orderItems.length === 0}
                                      className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700"
                                    >
                                      <Package className="h-3.5 w-3.5 mr-1" />
                                      Add SL/GC
                                    </Button>
                                  </div>
                                </div>

                                {isLoadingItems ? (
                                  <div className="flex items-center justify-center py-6 gap-2 text-gray-500">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="text-sm">Đang tải...</span>
                                  </div>
                                ) : jobItems.length === 0 ? (
                                  <div className="py-6 text-center text-gray-500 text-sm">
                                    <Package className="h-6 w-6 mx-auto text-gray-300 mb-2" />
                                    <p>Chưa có sản phẩm trong phiếu này</p>
                                  </div>
                                ) : (
                                  <div className="border rounded overflow-hidden">
                                    <table className="w-full text-sm">
                                      <thead className="bg-gray-50">
                                        <tr>
                                          <th className="text-left p-2 font-medium">Sản phẩm / Hạng mục</th>
                                          <th className="text-left p-2 font-medium w-20">ĐVT</th>
                                          <th className="text-right p-2 font-medium w-20">SL</th>
                                          <th className="text-right p-2 font-medium w-28">Đơn giá</th>
                                          <th className="text-right p-2 font-medium w-32">Thành tiền</th>
                                          <th className="text-center p-2 font-medium w-16"></th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {jobItems.map((item: any, idx: number) => (
                                          <tr key={idx} className="border-t group hover:bg-gray-50/50">
                                            <td className="p-2">
                                              <div className="flex items-center gap-2">
                                                <Package className="h-4 w-4 text-gray-400" />
                                                <span className="font-medium">{item.productName}</span>
                                              </div>
                                            </td>
                                            <td className="p-2 text-gray-600">{item.unit}</td>
                                            <td className="p-2 text-right">{Number(item.quantity || 0).toLocaleString()}</td>
                                            <td className="p-2 text-right text-gray-600">
                                              {formatCurrency(Number(item.unitPrice || 0))}
                                            </td>
                                            <td className="p-2 text-right font-medium text-blue-600">
                                              {formatCurrency(Number(item.lineTotal || (item.quantity || 0) * (item.unitPrice || 0)))}
                                            </td>
                                            <td className="p-2" onClick={(e) => e.stopPropagation()}>
                                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={() => openEditItem(job.id, item)}
                                                  title="Sửa"
                                                  className="h-8 w-8 p-0 hover:bg-blue-100"
                                                >
                                                  <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={() => setShowDeleteItemConfirm({ jobId: job.id, item })}
                                                  title="Xóa"
                                                  className="h-8 w-8 p-0 hover:bg-red-100"
                                                >
                                                  <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                              </div>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}

                                {/* Quick Actions */}
                                <div className="flex justify-end gap-2 mt-3 pt-3 border-t">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => { e.stopPropagation(); router.push(`/workshops/jobs/${job.id}`); }}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Xem chi tiết
                                  </Button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{editingJob ? 'Sửa phiếu gia công' : 'Tạo phiếu gia công mới'}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Project Info */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Factory className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium text-orange-700">Đơn hàng</p>
                    <p className="text-sm text-orange-600">{projectCode} - {projectName}</p>
                  </div>
                </div>
              </div>

              {/* Workshop Selection */}
              <div>
                <label className="block text-sm font-medium mb-1">Xưởng gia công *</label>
                <Select
                  value={form.workshopId}
                  onChange={(e) => setForm({ ...form, workshopId: e.target.value })}
                  className="w-full"
                >
                  <option value="">Chọn xưởng...</option>
                  {workshops.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </Select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium mb-1">Tiêu đề</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ví dụ: Gia công trần gỗ tầng 1"
                />
              </div>

              {/* Products Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">Danh mục sản phẩm</label>
                  <Button variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-1" />
                    Thêm sản phẩm
                  </Button>
                </div>

                {items.length === 0 ? (
                  <div className="border rounded-lg p-4 text-center text-gray-500">
                    <Package className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                    <p>Chưa có sản phẩm nào</p>
                    <p className="text-sm">Nhấp &quot;Thêm sản phẩm&quot; để chọn từ danh mục</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-2 font-medium w-8">#</th>
                          <th className="text-left p-2 font-medium">Sản phẩm</th>
                          <th className="text-left p-2 font-medium w-20">ĐVT</th>
                          <th className="text-left p-2 font-medium w-24">SL</th>
                          <th className="text-left p-2 font-medium w-28">Đơn giá</th>
                          <th className="text-right p-2 font-medium w-32">Thành tiền</th>
                          <th className="text-left p-2 font-medium w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, index) => (
                          <tr key={index} className="border-t">
                            <td className="p-2 text-gray-500">{index + 1}</td>
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                {item.source === 'product_master' ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingItemIndex(index);
                                      setShowProductPicker(true);
                                    }}
                                    className="h-8 w-8 p-0"
                                    title="Chọn từ danh mục"
                                  >
                                    <Package className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <span className="h-8 w-8 flex items-center justify-center text-gray-400">
                                    <Package className="h-4 w-4" />
                                  </span>
                                )}
                                <div className="flex flex-col">
                                  <span className="font-medium text-sm">{item.name}</span>
                                  {item.source === 'order_item' && (
                                    <span className="text-xs text-gray-400">Từ đơn hàng</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-2">
                              <Input
                                value={item.unit}
                                onChange={(e) => updateItem(index, { unit: e.target.value })}
                                placeholder="ĐVT"
                                className="h-8"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                min="0"
                                value={item.qty}
                                onChange={(e) => updateItem(index, { qty: e.target.value })}
                                placeholder="0"
                                className="h-8"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                min="0"
                                value={item.unitPrice}
                                onChange={(e) => updateItem(index, { unitPrice: e.target.value })}
                                placeholder="0"
                                className="h-8"
                              />
                            </td>
                            <td className="p-2 text-right font-medium">
                              {formatCurrency(calculateItemAmount(item))}
                            </td>
                            <td className="p-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(index)}
                                className="text-red-500 p-1 h-8 w-8"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan={3} className="p-3 text-right font-medium">Tổng cộng:</td>
                          <td className="p-3 text-right font-bold text-blue-600">
                            {formatCurrency(calculateTotalAmount())}
                          </td>
                          <td></td>
                          <td></td>
                          <td></td>
                          <td></td>
                          <td></td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium mb-1">Ghi chú</label>
                <Input
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Nhập ghi chú..."
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowModal(false)}>Hủy</Button>
                <Button onClick={handleSubmit}>
                  {editingJob ? 'Cập nhật' : 'Tạo mới'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Product Picker */}
      {showProductPicker && (
        <ProductPicker
          value={editingItemIndex !== null ? { product: items[editingItemIndex].product || null, variant: null } : { product: null, variant: null }}
          onChange={handleSelectProduct}
          onClose={() => {
            setShowProductPicker(false);
            setEditingItemIndex(null);
          }}
          onCreateNew={() => {
            setShowProductPicker(false);
          }}
        />
      )}

      {/* Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Chi tiết phiếu gia công</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowDetail(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Số phiếu</p>
                  <p className="font-medium">{showDetail.code}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Xưởng</p>
                  <p className="font-medium">{showDetail.workshop?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Ngày bắt đầu</p>
                  <p className="font-medium">{formatDate(showDetail.startDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Hạn hoàn thành</p>
                  <p className="font-medium">{formatDate(showDetail.dueDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tổng tiền</p>
                  <p className="font-medium text-lg">{formatCurrency(showDetail.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Đã thanh toán</p>
                  <p className="font-medium text-green-600">{formatCurrency(showDetail.paidAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Còn nợ</p>
                  <p className={`font-medium text-lg ${showDetail.amount - showDetail.paidAmount > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                    {formatCurrency(showDetail.amount - showDetail.paidAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Trạng thái</p>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs ${getStatusColor(showDetail.status)}`}>
                    {getStatusLabel(showDetail.status)}
                  </span>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Tiêu đề</p>
                  <p className="font-medium">{showDetail.title || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Ghi chú</p>
                  <p className="font-medium">{showDetail.note || '-'}</p>
                </div>
              </div>

              {/* Items Summary */}
              {showDetail.items && showDetail.items.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Sản phẩm trong phiếu</h4>
                  <div className="space-y-2">
                    {showDetail.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                        <span>{item.productName} ({item.unit})</span>
                        <span className="font-medium">{formatCurrency(Number(item.lineTotal || 0))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary Footer */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Tổng tiền:</span>
                  <span className="font-medium">{formatCurrency(showDetail.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Đã thanh toán:</span>
                  <span className="font-medium text-green-600">-{formatCurrency(showDetail.paidAmount)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm font-medium">Còn nợ:</span>
                  <span className={`font-bold ${showDetail.amount - showDetail.paidAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(showDetail.amount - showDetail.paidAmount)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="py-6 text-center">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium mb-2">Xác nhận xóa?</h3>
              <p className="text-gray-500 mb-4">
                Bạn có chắc muốn xóa phiếu <strong>{showConfirmDelete.code}</strong>?
                <br />Thao tác này không thể hoàn tác.
              </p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => setShowConfirmDelete(null)}>Hủy</Button>
                <Button variant="destructive" onClick={() => handleDelete(showConfirmDelete)}>Xóa</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Sửa hạng mục gia công</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setEditingItem(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 rounded p-3 text-sm">
                <p className="font-medium">{editingItem.item.productName}</p>
                <p className="text-gray-500">ĐVT: {editingItem.item.unit}</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Số lượng</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editItemForm.qty}
                  onChange={(e) => setEditItemForm({ ...editItemForm, qty: e.target.value })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Đơn giá (VND)</label>
                <Input
                  type="number"
                  min="0"
                  value={editItemForm.unitPrice}
                  onChange={(e) => setEditItemForm({ ...editItemForm, unitPrice: e.target.value })}
                  className="w-full"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditingItem(null)}>Hủy</Button>
                <Button onClick={handleSaveEditItem}>Lưu</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Item Confirm Modal */}
      {showDeleteItemConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="py-6 text-center">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium mb-2">Xóa hạng mục?</h3>
              <p className="text-gray-500 mb-4">
                Xóa <strong>{showDeleteItemConfirm.item.productName}</strong> khỏi phiếu gia công?
              </p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => setShowDeleteItemConfirm(null)}>Hủy</Button>
                <Button variant="destructive" onClick={handleDeleteItem}>Xóa</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SL Mapping Modal */}
      {showSLMappingModal && selectedJobForSL && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Add SL/GC - {selectedJobForSL.code}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowSLMappingModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
                <p className="text-orange-700 font-medium">Lấy số liệu nghiệm thu</p>
                <p className="text-orange-600">Hệ thống sẽ lấy SLNT từ đơn hàng và điền vào cột SL mới.</p>
              </div>

                                      <div className="border rounded overflow-hidden">
                                        <table className="w-full text-sm">
                                          <thead className="bg-gray-50">
                                            <tr>
                                              <th className="text-left p-2 font-medium">Sản phẩm</th>
                                              <th className="text-right p-2 font-medium w-24">SLNT</th>
                                              <th className="text-right p-2 font-medium w-28">SL mới</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {slMappingItems.map((item, idx) => (
                                              <tr key={idx} className="border-t">
                                                <td className="p-2">
                                                  <div className="font-medium">{item.productName}</div>
                                                  {item.unit && <div className="text-xs text-gray-400">ĐVT: {item.unit}</div>}
                                                </td>
                                                <td className="p-2 text-right">
                                                  {item.slnt !== null ? (
                                                    <span className="font-medium text-blue-600">{item.slnt}</span>
                                                  ) : (
                                                    <span className="text-gray-400">-</span>
                                                  )}
                                                </td>
                                                <td className="p-2">
                                                  <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={item.newQty}
                                                    onChange={(e) => {
                                                      const newItems = [...slMappingItems];
                                                      newItems[idx].newQty = e.target.value;
                                                      setSLMappingItems(newItems);
                                                    }}
                                                    className="w-24 text-right h-8"
                                                  />
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>

              <div className="flex justify-between pt-2">
                <Button variant="default" onClick={handleFetchAcceptanceData}>
                  <Package className="h-4 w-4 mr-1" />
                  Lấy SLNT từ đơn hàng
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowSLMappingModal(false)}>Hủy</Button>
                  <Button onClick={handleSaveSLMapping}>Lưu</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
