"use client";

import { CustomerDetail } from "@/components/clients/customer-detail";
import { CustomerForm } from "@/components/clients/customer-form";
import { UserForm } from "@/components/users/user-form";
import { ExtinguisherForm } from "@/app/dashboard/extintores/extinguisher-form";
import { InvoiceDetail } from "@/app/dashboard/financeiro/[id]/invoice-detail";
import { InvoiceForm } from "@/app/dashboard/financeiro/invoice-form";
import { OSDetail } from "@/app/dashboard/os/[id]/os-detail";
import { OSForm } from "@/app/dashboard/os/os-form";
import { ProductForm } from "@/app/dashboard/produtos/product-form";
import { useClient, useClientDashboardData } from "@/hooks/useClients";
import { useExtinguisher } from "@/hooks/useExtinguishers";
import { useInvoice } from "@/hooks/useInvoices";
import { useProduct } from "@/hooks/useProducts";
import { useServiceOrder, useServiceOrderItems } from "@/hooks/useServiceOrders";
import { useUserProfile } from "@/hooks/useUsers";

function QueryState({ loading, error }: { loading: boolean; error: boolean }) {
  if (loading) return <p className="py-12 text-center text-sm text-muted-foreground">Carregando dados...</p>;
  if (error) return <p role="alert" className="py-12 text-center text-sm text-destructive">Não foi possível carregar os dados. Tente novamente.</p>;
  return null;
}

export function CustomerEditLoader({ id }: { id: string }) {
  const query = useClient(id);
  if (!query.data) return <QueryState loading={query.isLoading} error={query.isError} />;
  return <CustomerForm mode="edit" initialData={query.data} />;
}

export function CustomerDetailLoader({ id }: { id: string }) {
  const query = useClientDashboardData(id);
  if (!query.data) return <QueryState loading={query.isLoading} error={query.isError} />;
  return <CustomerDetail {...query.data} />;
}

export function ExtinguisherEditLoader({ id }: { id: string }) {
  const query = useExtinguisher(id);
  if (!query.data) return <QueryState loading={query.isLoading} error={query.isError} />;
  return <ExtinguisherForm mode="edit" initialData={query.data} />;
}

export function InvoiceEditLoader({ id }: { id: string }) {
  const query = useInvoice(id);
  if (!query.data) return <QueryState loading={query.isLoading} error={query.isError} />;
  return <InvoiceForm mode="edit" initialData={query.data} />;
}

export function InvoiceDetailLoader({ id }: { id: string }) {
  const invoiceQuery = useInvoice(id);
  const invoice = invoiceQuery.data;
  const customerQuery = useClient(invoice?.customer_id ?? "");
  const orderQuery = useServiceOrder(invoice?.service_order_id ?? "");
  if (!invoice) return <QueryState loading={invoiceQuery.isLoading} error={invoiceQuery.isError} />;
  return <InvoiceDetail invoice={invoice} customer={customerQuery.data ?? null} serviceOrder={orderQuery.data ?? null} />;
}

export function OSFormLoader({ id }: { id?: string }) {
  const orderQuery = useServiceOrder(id ?? "");
  const itemsQuery = useServiceOrderItems(id ?? "");
  if (id && !orderQuery.data) return <QueryState loading={orderQuery.isLoading} error={orderQuery.isError} />;
  return <OSForm mode={id ? "edit" : "create"} initialData={orderQuery.data} initialItems={itemsQuery.data} />;
}

export function OSDetailLoader({ id }: { id: string }) {
  const orderQuery = useServiceOrder(id);
  const order = orderQuery.data;
  const itemsQuery = useServiceOrderItems(id);
  const customerQuery = useClient(order?.customer_id ?? "");
  const technicianQuery = useUserProfile(order?.technician_id ?? "");
  if (!order) return <QueryState loading={orderQuery.isLoading} error={orderQuery.isError} />;
  return <OSDetail order={order} items={itemsQuery.data ?? []} customer={customerQuery.data ?? null} technician={technicianQuery.data ?? null} />;
}

export function ProductEditLoader({ id }: { id: string }) {
  const query = useProduct(id);
  if (!query.data) return <QueryState loading={query.isLoading} error={query.isError} />;
  return <ProductForm mode="edit" initialData={query.data} />;
}

export function UserEditLoader({ id }: { id: string }) {
  const query = useUserProfile(id);
  if (!query.data) return <QueryState loading={query.isLoading} error={query.isError} />;
  return <UserForm mode="edit" initialData={query.data} />;
}
