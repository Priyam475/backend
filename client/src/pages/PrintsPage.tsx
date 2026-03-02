import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Printer, Search, FileText, Download, Truck, DollarSign,
  Shield, Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import BottomNav from '@/components/BottomNav';
import { useDesktopMode } from '@/hooks/use-desktop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { arrivalsApi } from '@/services/api';
import type { ArrivalDetail } from '@/services/api/arrivals';

/* ── Print Templates from SRS ── */
const printTemplates = [
  { id: 'sale_pad', name: 'Sale Pad Print', stage: 'Pre-Auction', size: 'A5 Portrait', icon: FileText, color: 'from-blue-500 to-cyan-400' },
  { id: 'sales_sticker', name: 'Sales Sticker', stage: 'Pre-Auction', size: '150mm×80mm Thermal', icon: Printer, color: 'from-emerald-500 to-teal-400' },
  { id: 'tender_form', name: 'Tender Form (APMC)', stage: 'Pre-Auction', size: 'A4 Portrait', icon: FileText, color: 'from-violet-500 to-purple-400' },
  { id: 'tender_slip', name: 'Tender Slip for Buyers', stage: 'Pre-Auction', size: 'A4 Landscape (Triplicate)', icon: FileText, color: 'from-amber-500 to-orange-400' },
  { id: 'chiti_buyer', name: 'Chiti for Buyer', stage: 'Post-Auction', size: '80mm Thermal Roll', icon: Printer, color: 'from-pink-500 to-rose-400' },
  { id: 'dispatch_coolie', name: 'Dispatch Control (Coolie)', stage: 'Post-Auction', size: 'A5 Portrait', icon: Truck, color: 'from-indigo-500 to-blue-400' },
  { id: 'buyer_delivery', name: 'Buyer Delivery Report', stage: 'Post-Weighing', size: 'A4 Portrait', icon: FileText, color: 'from-cyan-500 to-blue-400' },
  { id: 'chiti_seller', name: 'Chiti for Seller', stage: 'Post-Weighing', size: '80mm Thermal Roll', icon: Printer, color: 'from-rose-500 to-pink-400' },
  { id: 'gst_bill', name: 'GST Sales Bill (Buyer)', stage: 'Billing', size: 'A4 Portrait', icon: FileText, color: 'from-emerald-500 to-green-400' },
  { id: 'nongst_bill', name: 'Non-GST Sales Bill', stage: 'Billing', size: 'A5 Portrait', icon: FileText, color: 'from-amber-500 to-yellow-400' },
  { id: 'seller_invoice', name: 'Non-GST Sales Invoice (Seller)', stage: 'Settlement', size: 'A4/A5 Portrait', icon: FileText, color: 'from-purple-500 to-violet-400' },
  { id: 'main_invoice', name: 'Main Invoice A4 (Collated)', stage: 'Settlement', size: 'A4 Portrait', icon: FileText, color: 'from-blue-500 to-indigo-400' },
  { id: 'invoice_a5', name: 'Invoice A5 (Single Seller)', stage: 'Settlement', size: 'A5 Portrait', icon: FileText, color: 'from-teal-500 to-cyan-400' },
  { id: 'market_fee', name: 'Market Fee Report', stage: 'Compliance', size: 'A4 Portrait', icon: DollarSign, color: 'from-teal-500 to-emerald-400' },
  { id: 'gst_report', name: 'GST Report', stage: 'Compliance', size: 'A4 Portrait', icon: Shield, color: 'from-red-500 to-rose-400' },
];

const stageColors: Record<string, string> = {
  'Pre-Auction': 'from-blue-500/10 to-blue-400/5 border-blue-200/50 dark:border-blue-800/30',
  'Post-Auction': 'from-pink-500/10 to-pink-400/5 border-pink-200/50 dark:border-pink-800/30',
  'Post-Weighing': 'from-cyan-500/10 to-cyan-400/5 border-cyan-200/50 dark:border-cyan-800/30',
  'Billing': 'from-emerald-500/10 to-emerald-400/5 border-emerald-200/50 dark:border-emerald-800/30',
  'Settlement': 'from-violet-500/10 to-violet-400/5 border-violet-200/50 dark:border-violet-800/30',
  'Compliance': 'from-amber-500/10 to-amber-400/5 border-amber-200/50 dark:border-amber-800/30',
};

const stageBadgeColors: Record<string, string> = {
  'Pre-Auction': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'Post-Auction': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  'Post-Weighing': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  'Billing': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  'Settlement': 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  'Compliance': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

/* ── Mock firm info ── */
const FIRM = {
  name: 'Krishna Trading Co.',
  about: 'Commission Agents & Wholesalers',
  address: 'Market Yard, Main Road, Pune - 411001',
  apmcCode: 'APMC2024MH',
  phone: '+91 98765 43210',
  email: 'krishna@mercotrace.in',
  gstin: '27AABCK1234F1Z5',
  bank: { name: 'State Bank of India', acc: '1234567890', ifsc: 'SBIN0001234', branch: 'Market Yard Branch' },
};

/* ── Flatten arrival details to sample lot rows for print templates ── */
function flattenArrivalDetailsToSampleLots(details: ArrivalDetail[]): { lot_name: string; lot_no: string; seller: string; vehicle: string; qty: number }[] {
  const out: { lot_name: string; lot_no: string; seller: string; vehicle: string; qty: number }[] = [];
  details.forEach((arr) => {
    (arr.sellers || []).forEach((seller) => {
      (seller.lots || []).forEach((lot) => {
        out.push({
          lot_name: lot.lotName || 'Lot',
          lot_no: String(lot.id),
          seller: seller.sellerName || 'Seller',
          vehicle: arr.vehicleNumber || 'MH-12-XX-0000',
          qty: 0,
        });
      });
    });
  });
  return out;
}

/* ── Generate template HTML for printing ── */
function generateTemplateHTML(templateId: string, arrivalDetails: ArrivalDetail[]): string {
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const flatLots = flattenArrivalDetailsToSampleLots(arrivalDetails);
  const sampleLots = flatLots.length > 0
    ? flatLots.slice(0, 5).map((l) => ({ ...l, lot_name: l.lot_name, lot_no: l.lot_no, seller: l.seller, vehicle: l.vehicle, qty: l.qty || 10 }))
    : [
        { lot_name: 'Onion A-Grade', lot_no: 'ONI/001/26', seller: 'Ramesh Kumar', vehicle: 'MH-12-AB-1234', qty: 30, rate: 825, weight: 1500 },
        { lot_name: 'Onion B-Grade', lot_no: 'ONI/002/26', seller: 'Suresh Patil', vehicle: 'MH-14-CD-5678', qty: 25, rate: 805, weight: 1250 },
        { lot_name: 'Tomato Fresh', lot_no: 'TOM/003/26', seller: 'Ramesh Kumar', vehicle: 'MH-12-AB-1234', qty: 20, rate: 600, weight: 1000 },
      ];

  const commonHeader = `
    <div style="text-align:center; border-bottom:2px solid #222; padding-bottom:10px; margin-bottom:14px">
      <div style="font-size:8px; color:#888; letter-spacing:1px">${FIRM.apmcCode}</div>
      <div style="font-size:20px; font-weight:800; color:#1a1a2e">${FIRM.name}</div>
      <div style="font-size:11px; color:#555">${FIRM.about}</div>
      <div style="font-size:10px; color:#777">${FIRM.address}</div>
      <div style="font-size:10px; color:#777">Ph: ${FIRM.phone} | ${FIRM.email}</div>
    </div>`;

  const footer = `
    <div style="margin-top:28px; border-top:1px solid #ddd; padding-top:8px; display:flex; justify-content:space-between; font-size:9px; color:#aaa">
      <span>Powered by MERCOTRACE</span>
      <span>Page 1/1</span>
      <span>Authorized Signatory</span>
    </div>`;

  const sampleBuyer = { name: 'Vijay Traders', mark: 'VT', address: 'Shop 42, Market Area', phone: '+91 98765 11111' };

  const tableStyle = 'width:100%; border-collapse:collapse; font-size:11px';
  const thStyle = 'background:#f0f4ff; border:1px solid #d0d8e8; padding:6px; text-align:left; font-weight:600; color:#374151; font-size:10px';
  const tdStyle = 'border:1px solid #e0e4ec; padding:5px';

  switch (templateId) {
    case 'sale_pad':
      return `<div style="font-family:'Segoe UI',Arial,sans-serif; max-width:420px; margin:auto; padding:16px; font-size:12px">
        ${commonHeader}
        <div style="text-align:center; font-weight:bold; font-size:15px; margin-bottom:14px; color:#1a1a2e">SALE PAD</div>
        <div style="font-size:11px; margin-bottom:8px; color:#555">Date: ${today}</div>
        <table style="${tableStyle}">
          <tr><th style="${thStyle}">Vehicle</th><th style="${thStyle}">Qty</th></tr>
          ${sampleLots.map((l: any) => `<tr><td style="${tdStyle}">${l.vehicle}</td><td style="${tdStyle}; text-align:right">${l.qty}</td></tr>`).join('')}
        </table>
        <table style="${tableStyle}; margin-top:12px">
          <tr><th style="${thStyle}">Slr No</th><th style="${thStyle}">Seller Name</th><th style="${thStyle}">Qty</th></tr>
          ${sampleLots.map((l: any, i: number) => `<tr><td style="${tdStyle}">${i + 1}</td><td style="${tdStyle}">${l.seller}</td><td style="${tdStyle}; text-align:right">${l.qty}</td></tr>`).join('')}
        </table>
        <table style="${tableStyle}; margin-top:12px">
          <tr><th style="${thStyle}">Lot No</th><th style="${thStyle}">Lot Name</th></tr>
          ${sampleLots.map((l: any) => `<tr><td style="${tdStyle}">${l.lot_no}</td><td style="${tdStyle}">${l.lot_name}</td></tr>`).join('')}
        </table>
        ${footer}
      </div>`;

    case 'sales_sticker':
      const lot = sampleLots[0] || { lot_name: 'Onion', lot_no: 'ONI/001', seller: 'Seller', qty: 10 };
      return `<div style="font-family:'Segoe UI',Arial,sans-serif; width:150mm; padding:10px; font-size:11px; border:2px dashed #999">
        <div style="text-align:center; font-weight:800; font-size:15px; color:#1a1a2e">${FIRM.name}</div>
        <div style="display:flex; justify-content:space-between; margin-top:8px">
          <div><strong>Slr Sr No:</strong> 1</div><div><strong>Qty:</strong> ${lot.qty}</div>
        </div>
        <div style="font-size:18px; font-weight:bold; text-align:center; margin:10px 0; background:#f0f4ff; padding:6px; border-radius:4px; color:#1a1a2e">${lot.lot_name} / ${lot.lot_no}</div>
        <div style="display:flex; justify-content:space-between; font-size:10px; color:#666">
          <span>V.No: ${lot.vehicle || 'MH-12-AB-1234'}</span><span>Godown: A1</span>
        </div>
        <div style="text-align:center; font-size:9px; margin-top:8px; color:#aaa">Powered by MERCOTRACE</div>
      </div>`;

    case 'tender_form':
      return `<div style="font-family:'Segoe UI',Arial,sans-serif; max-width:700px; margin:auto; padding:20px; font-size:12px">
        ${commonHeader}
        <div style="text-align:center; font-weight:bold; font-size:17px; margin-bottom:16px; color:#1a1a2e">TENDER FORM</div>
        <div style="margin-bottom:10px; font-size:11px"><strong>Item Name:</strong> Onion A-Grade &nbsp;&nbsp;&nbsp; <strong>Rate:</strong> ₹/50kg &nbsp;&nbsp;&nbsp; <strong>Date:</strong> ${today}</div>
        <table style="${tableStyle}">
          <tr><th style="${thStyle}">Lot No</th><th style="${thStyle}">Bags</th><th style="${thStyle}">Farmer's Name</th><th style="${thStyle}">Purchaser</th></tr>
          ${sampleLots.map((l: any) => `<tr><td style="${tdStyle}">${l.lot_no}</td><td style="${tdStyle}; text-align:right">${l.qty}</td><td style="${tdStyle}">${l.seller}</td><td style="${tdStyle}"></td></tr>`).join('')}
        </table>
        ${footer}
      </div>`;

    case 'tender_slip':
      return `<div style="font-family:'Segoe UI',Arial,sans-serif; max-width:900px; margin:auto; padding:20px; font-size:11px">
        ${commonHeader}
        <div style="text-align:center; font-weight:bold; font-size:15px; margin-bottom:12px; color:#1a1a2e">TENDER SLIP FOR BUYERS (Triplicate)</div>
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px">
          ${[1, 2, 3].map(c => `<div style="border:1px solid #d0d8e8; padding:10px; border-radius:6px; background:#fafbff">
            <div style="font-weight:bold; font-size:10px; text-align:center; margin-bottom:6px; color:#5B8CFF">Copy ${c}</div>
            <div style="font-size:10px; text-align:center; font-weight:700">${FIRM.name}</div>
            <div style="font-size:9px; text-align:center; color:#666">${FIRM.about}</div>
            <div style="font-size:9px; text-align:center; color:#666">${FIRM.address}</div>
            <div style="font-size:9px; text-align:center; color:#888">APMC: ${FIRM.apmcCode}</div>
            <div style="font-size:9px; margin-top:4px">Date: ${today}</div>
            <table style="width:100%; border-collapse:collapse; font-size:9px; margin-top:4px">
              <tr style="background:#f0f4ff"><th style="border:1px solid #ddd; padding:3px">Lot</th><th style="border:1px solid #ddd; padding:3px">Qty</th><th style="border:1px solid #ddd; padding:3px">Rate</th></tr>
              ${sampleLots.slice(0, 3).map((l: any) => `<tr><td style="border:1px solid #ddd; padding:3px">${l.lot_no}</td><td style="border:1px solid #ddd; padding:3px">${l.qty}</td><td style="border:1px solid #ddd; padding:3px"></td></tr>`).join('')}
            </table>
          </div>`).join('')}
        </div>
        ${footer}
      </div>`;

    case 'chiti_buyer':
      return `<div style="font-family:'Segoe UI',Arial,sans-serif; width:80mm; padding:10px; font-size:10px; border:2px dashed #999">
        <div style="text-align:center; font-weight:800; font-size:13px; color:#1a1a2e">${FIRM.name}</div>
        <div style="margin-top:6px"><strong>Buyer's Mark:</strong> ${sampleBuyer.mark}</div>
        <table style="width:100%; border-collapse:collapse; font-size:9px; margin-top:8px">
          <tr style="background:#f0f4ff"><th style="border:1px solid #ddd; padding:4px">Lot Name/No</th><th style="border:1px solid #ddd; padding:4px">Godown</th><th style="border:1px solid #ddd; padding:4px">Qty</th><th style="border:1px solid #ddd; padding:4px">Rate/50kg</th><th style="border:1px solid #ddd; padding:4px">Weight</th><th style="border:1px solid #ddd; padding:4px">Amount</th></tr>
          ${sampleLots.map((l: any) => `<tr>
            <td style="border:1px solid #ddd; padding:3px">${l.lot_name}<br/><small style="color:#888">${l.lot_no}</small></td>
            <td style="border:1px solid #ddd; padding:3px">A1</td>
            <td style="border:1px solid #ddd; padding:3px; text-align:right">${l.qty}</td>
            <td style="border:1px solid #ddd; padding:3px; text-align:right">₹${l.rate || 800}</td>
            <td style="border:1px solid #ddd; padding:3px; text-align:right">${l.weight || l.qty * 50}</td>
            <td style="border:1px solid #ddd; padding:3px; text-align:right">₹${((l.rate || 800) * (l.weight || l.qty * 50) / 50).toLocaleString()}</td>
          </tr>`).join('')}
        </table>
        <div style="font-weight:bold; margin-top:8px; text-align:right">Total Bids: ${sampleLots.length}</div>
        <div style="text-align:center; font-size:8px; margin-top:10px; color:#aaa">Delivered by MERCOTRACE</div>
        <div style="border-top:2px dashed #ccc; margin-top:10px; text-align:center; font-size:8px; color:#bbb; padding-top:4px">--- CUT HERE ---</div>
      </div>`;

    case 'dispatch_coolie':
      return `<div style="font-family:'Segoe UI',Arial,sans-serif; max-width:420px; margin:auto; padding:16px; font-size:11px">
        ${commonHeader}
        <div style="text-align:center; font-weight:bold; font-size:14px; margin-bottom:12px; color:#1a1a2e">DISPATCH CONTROL — COOLIE</div>
        <div style="margin-bottom:10px; font-size:11px; color:#555"><strong>Vehicle:</strong> MH-12-AB-1234 &nbsp; <strong>Qty:</strong> 75 bags &nbsp; <strong>Godown:</strong> A1</div>
        <table style="${tableStyle}">
          <tr><th style="${thStyle}">Slr No</th><th style="${thStyle}">Seller Name</th><th style="${thStyle}">Qty</th><th style="${thStyle}">Lot No</th><th style="${thStyle}">Lot Name</th></tr>
          ${sampleLots.map((l: any, i: number) => `<tr><td style="${tdStyle}">${i + 1}</td><td style="${tdStyle}">${l.seller}</td><td style="${tdStyle}; text-align:right">${l.qty}</td><td style="${tdStyle}">${l.lot_no}</td><td style="${tdStyle}">${l.lot_name}</td></tr>`).join('')}
        </table>
        <div style="margin-top:14px; font-size:10px; font-weight:600"><strong>Buyer Mark & Quantity:</strong></div>
        <table style="${tableStyle}; margin-top:4px">
          <tr><th style="${thStyle}">Buyer Mark</th><th style="${thStyle}">Quantity</th></tr>
          <tr><td style="${tdStyle}">${sampleBuyer.mark}</td><td style="${tdStyle}; text-align:right">30</td></tr>
        </table>
        <div style="font-size:9px; color:#aaa; margin-top:8px; text-align:center">Post Auction – Pre Weighing</div>
        ${footer}
      </div>`;

    case 'buyer_delivery':
      return `<div style="font-family:'Segoe UI',Arial,sans-serif; max-width:700px; margin:auto; padding:20px; font-size:12px">
        ${commonHeader}
        <div style="display:flex; justify-content:space-between; margin-bottom:14px">
          <div><strong>M/s</strong> ${sampleBuyer.name}<br/><span style="font-size:10px; color:#666">Customer Mark: ${sampleBuyer.mark}</span></div>
          <div style="text-align:right; font-size:11px"><strong>Bill No:</strong> BIL-2026-0042<br/><strong>Bill Date:</strong> ${today}<br/><strong>Item:</strong> Onion A-Grade<br/><strong>Qty:</strong> 55 bags</div>
        </div>
        ${sampleLots.map((l: any) => `<div style="margin-bottom:14px; border:1px solid #e0e4ec; padding:10px; border-radius:6px; background:#fafbff">
          <div style="display:flex; justify-content:space-between; margin-bottom:6px"><strong>${l.lot_name} / ${l.lot_no}</strong><span style="font-size:11px; color:#555">Qty: ${l.qty} | Weight: ${l.weight || l.qty * 50}kg | Rate: ₹${l.rate || 800}/50kg</span></div>
          <div style="font-size:10px; color:#888; word-break:break-all">${Array.from({ length: l.qty || 10 }, () => `${(48 + Math.random() * 4).toFixed(1)}`).join(' ')}</div>
        </div>`).join('')}
        <div style="text-align:right; font-weight:bold; margin-top:10px">For ${FIRM.name}</div>
        ${footer}
      </div>`;

    case 'chiti_seller':
      return `<div style="font-family:'Segoe UI',Arial,sans-serif; width:80mm; padding:10px; font-size:10px; border:2px dashed #999">
        <div style="text-align:center; font-weight:800; font-size:13px; color:#1a1a2e">${FIRM.name}</div>
        <div style="margin-top:6px"><strong>Seller:</strong> ${sampleLots[0]?.seller || 'Ramesh Kumar'} &nbsp; <strong>Slr Sr No:</strong> 1</div>
        <table style="width:100%; border-collapse:collapse; font-size:9px; margin-top:8px">
          <tr style="background:#f0f4ff"><th style="border:1px solid #ddd; padding:4px">Lot Name/No</th><th style="border:1px solid #ddd; padding:4px">Qty</th><th style="border:1px solid #ddd; padding:4px">Rate/50kg</th><th style="border:1px solid #ddd; padding:4px">Weight</th></tr>
          ${sampleLots.filter((l: any) => l.seller === (sampleLots[0]?.seller || 'Ramesh Kumar')).map((l: any) => `<tr>
            <td style="border:1px solid #ddd; padding:3px">${l.lot_name}<br/><small style="color:#888">${l.lot_no}</small></td>
            <td style="border:1px solid #ddd; padding:3px; text-align:right">${l.qty}</td>
            <td style="border:1px solid #ddd; padding:3px; text-align:right">₹${l.rate || 800}</td>
            <td style="border:1px solid #ddd; padding:3px; text-align:right">${l.weight || l.qty * 50}</td>
          </tr>`).join('')}
        </table>
        <div style="font-weight:bold; margin-top:8px; display:flex; justify-content:space-between; font-size:9px">
          <span>Total Lots: ${sampleLots.filter((l: any) => l.seller === (sampleLots[0]?.seller || 'Ramesh Kumar')).length}</span>
          <span>Total Qty: ${sampleLots.filter((l: any) => l.seller === (sampleLots[0]?.seller || 'Ramesh Kumar')).reduce((s: number, l: any) => s + (l.qty || 0), 0)}</span>
          <span>₹${sampleLots.filter((l: any) => l.seller === (sampleLots[0]?.seller || 'Ramesh Kumar')).reduce((s: number, l: any) => s + ((l.rate || 800) * (l.weight || l.qty * 50) / 50), 0).toLocaleString()}</span>
        </div>
        <div style="text-align:center; font-size:8px; margin-top:10px; color:#aaa">Delivered by MERCOTRACE</div>
        <div style="border-top:2px dashed #ccc; margin-top:10px; text-align:center; font-size:8px; color:#bbb; padding-top:4px">--- CUT HERE ---</div>
      </div>`;

    case 'gst_bill':
      return `<div style="font-family:'Segoe UI',Arial,sans-serif; max-width:700px; margin:auto; padding:20px; font-size:12px">
        <div style="display:flex; justify-content:space-between; font-size:9px; margin-bottom:4px; color:#888">
          <span>GSTIN: ${FIRM.gstin}</span><span>PAN: AABCK1234F</span>
        </div>
        ${commonHeader}
        <div style="text-align:center; font-weight:800; font-size:17px; margin-bottom:14px; color:#1a1a2e">TAX INVOICE</div>
        <div style="display:flex; justify-content:space-between; margin-bottom:14px">
          <div><strong>To,</strong><br/>M/s ${sampleBuyer.name}<br/><span style="font-size:10px; color:#666">${sampleBuyer.address}</span></div>
          <div style="text-align:right; font-size:11px"><strong>Bill No:</strong> GST-2026-0042<br/><strong>Bill Date:</strong> ${today}<br/><strong>Item:</strong> Onion A-Grade<br/><strong>HSN Code:</strong> 07031019</div>
        </div>
        <table style="${tableStyle}">
          <tr><th style="${thStyle}">Mark</th><th style="${thStyle}">Quantity</th><th style="${thStyle}">Weight, kg</th><th style="${thStyle}">Rate, ₹/50kg</th><th style="${thStyle}">Amount</th></tr>
          ${sampleLots.map((l: any) => {
            const wt = l.weight || l.qty * 50;
            const amt = (l.rate || 800) * wt / 50;
            return `<tr><td style="${tdStyle}">${sampleBuyer.mark}</td><td style="${tdStyle}; text-align:right">${l.qty}</td><td style="${tdStyle}; text-align:right">${wt}</td><td style="${tdStyle}; text-align:right">₹${l.rate || 800}</td><td style="${tdStyle}; text-align:right">₹${amt.toLocaleString()}</td></tr>`;
          }).join('')}
          <tr style="font-weight:bold; background:#f0f4ff"><td style="${tdStyle}" colspan="4">Total</td><td style="${tdStyle}; text-align:right">₹${sampleLots.reduce((s: number, l: any) => s + ((l.rate || 800) * (l.weight || l.qty * 50) / 50), 0).toLocaleString()}</td></tr>
        </table>
        <table style="${tableStyle}; margin-top:14px">
          <tr style="background:#f0f4ff"><th style="${thStyle}">Tax</th><th style="${thStyle}">Rate</th><th style="${thStyle}">Amount</th></tr>
          <tr><td style="${tdStyle}">CGST</td><td style="${tdStyle}">2.5%</td><td style="${tdStyle}; text-align:right">₹${(sampleLots.reduce((s: number, l: any) => s + ((l.rate || 800) * (l.weight || l.qty * 50) / 50), 0) * 0.025).toFixed(0)}</td></tr>
          <tr><td style="${tdStyle}">SGST</td><td style="${tdStyle}">2.5%</td><td style="${tdStyle}; text-align:right">₹${(sampleLots.reduce((s: number, l: any) => s + ((l.rate || 800) * (l.weight || l.qty * 50) / 50), 0) * 0.025).toFixed(0)}</td></tr>
          <tr style="font-weight:bold; background:#f0f4ff"><td style="${tdStyle}" colspan="2">Total Tax</td><td style="${tdStyle}; text-align:right">₹${(sampleLots.reduce((s: number, l: any) => s + ((l.rate || 800) * (l.weight || l.qty * 50) / 50), 0) * 0.05).toFixed(0)}</td></tr>
        </table>
        <div style="margin-top:14px; font-size:12px; font-weight:700"><strong>Total Amount:</strong> ₹${(sampleLots.reduce((s: number, l: any) => s + ((l.rate || 800) * (l.weight || l.qty * 50) / 50), 0) * 1.05).toFixed(0)}</div>
        <div style="font-size:10px; margin-top:4px; color:#666">Total Amount in words: Rupees ${numberToWords(Math.round(sampleLots.reduce((s: number, l: any) => s + ((l.rate || 800) * (l.weight || l.qty * 50) / 50), 0) * 1.05))} Only</div>
        <div style="margin-top:16px; padding:10px; background:#f8faff; border-radius:6px; font-size:10px; border:1px solid #e0e4ec">
          <strong>Bank Details:</strong> ${FIRM.bank.name} | A/c: ${FIRM.bank.acc} | IFSC: ${FIRM.bank.ifsc} | ${FIRM.bank.branch}
        </div>
        <div style="margin-top:6px; font-size:10px"><strong>COPY NAME:</strong> Original &nbsp; | &nbsp; <strong>BUYER'S MARK:</strong> ${sampleBuyer.mark}</div>
        <div style="text-align:right; font-weight:bold; margin-top:14px">For ${FIRM.name}</div>
        ${footer}
      </div>`;

    case 'nongst_bill':
      return `<div style="font-family:'Segoe UI',Arial,sans-serif; max-width:420px; margin:auto; padding:16px; font-size:11px">
        ${commonHeader}
        <div style="text-align:center; font-weight:bold; font-size:15px; margin-bottom:12px; color:#1a1a2e">SALES BILL (Non-GST)</div>
        <div style="display:flex; justify-content:space-between; margin-bottom:12px">
          <div><strong>To,</strong><br/>M/s ${sampleBuyer.name}<br/><small style="color:#666">${sampleBuyer.address} | ${sampleBuyer.phone}</small></div>
          <div style="text-align:right; font-size:10px"><strong>Bill No:</strong> BIL-2026-0042<br/><strong>Bill Date:</strong> ${today}</div>
        </div>
        <table style="${tableStyle}">
          <tr><th style="${thStyle}">Mark</th><th style="${thStyle}">Qty</th><th style="${thStyle}">Weight</th><th style="${thStyle}">Rate ₹/50kg</th><th style="${thStyle}">Amount</th></tr>
          ${sampleLots.map((l: any) => {
            const wt = l.weight || l.qty * 50;
            const amt = (l.rate || 800) * wt / 50;
            return `<tr><td style="${tdStyle}">${sampleBuyer.mark}</td><td style="${tdStyle}; text-align:right">${l.qty}</td><td style="${tdStyle}; text-align:right">${wt}</td><td style="${tdStyle}; text-align:right">₹${l.rate || 800}</td><td style="${tdStyle}; text-align:right">₹${amt.toLocaleString()}</td></tr>`;
          }).join('')}
        </table>
        <div style="margin-top:10px; text-align:right; font-size:10px; color:#555">
          ${['Commission @5%', 'User Fee @2%', 'Coolie ₹20/bag'].map((c, i) => `<div>${c}: ₹${[3000, 1200, 1500][i]}</div>`).join('')}
          <div style="font-weight:bold; margin-top:6px; font-size:13px; color:#1a1a2e">Total Amount: ₹${(sampleLots.reduce((s: number, l: any) => s + ((l.rate || 800) * (l.weight || l.qty * 50) / 50), 0) + 5700).toLocaleString()}</div>
        </div>
        <div style="font-size:9px; margin-top:4px; color:#888">Total Amount in words: Rupees Sixty-Two Thousand Seven Hundred Only</div>
        <div style="margin-top:6px; font-size:10px"><strong>COPY NAME:</strong> Original &nbsp; | &nbsp; <strong>BUYER'S MARK:</strong> ${sampleBuyer.mark}</div>
        <div style="text-align:right; font-weight:bold; margin-top:10px">For ${FIRM.name}</div>
        ${footer}
      </div>`;

    case 'seller_invoice':
    case 'main_invoice':
    case 'invoice_a5':
      const isA5 = templateId === 'invoice_a5';
      const isCollated = templateId === 'main_invoice';
      return `<div style="font-family:'Segoe UI',Arial,sans-serif; max-width:${isA5 ? '420px' : '700px'}; margin:auto; padding:${isA5 ? '16px' : '20px'}; font-size:${isA5 ? '10px' : '12px'}">
        ${commonHeader}
        <div style="text-align:center; font-weight:800; font-size:${isA5 ? '14px' : '17px'}; margin-bottom:14px; color:#1a1a2e">SALES INVOICE${isCollated ? ' (Collated)' : ''}</div>
        <div style="font-size:11px; margin-bottom:6px; color:#555">Sold <strong>75</strong> Bags of <strong>Onion A-Grade</strong> on account and risk of</div>
        <div style="display:flex; justify-content:space-between; margin-bottom:12px">
          <div>${sampleLots[0]?.seller || 'Ramesh Kumar'}, Nashik<br/><small style="color:#666">Address: Village Road, Nashik</small><br/><small style="color:#666">Vehicle No: MH-12-AB-1234</small></div>
          <div style="text-align:right; font-size:11px"><strong>Invoice No:</strong> INV-2026-0018<br/><strong>Invoice Date:</strong> ${today}</div>
        </div>
        <table style="${tableStyle}">
          <tr><th style="${thStyle}">Mark</th><th style="${thStyle}">Qty</th><th style="${thStyle}">Weight, kg</th><th style="${thStyle}">Rate ₹/50kg</th><th style="${thStyle}">Amount</th><th style="${thStyle}">Particulars</th><th style="${thStyle}">Deductions</th></tr>
          ${sampleLots.map((l: any) => {
            const wt = l.weight || l.qty * 50;
            const amt = (l.rate || 800) * wt / 50;
            return `<tr><td style="${tdStyle}">${sampleBuyer.mark}</td><td style="${tdStyle}; text-align:right">${l.qty}</td><td style="${tdStyle}; text-align:right">${wt}</td><td style="${tdStyle}; text-align:right">₹${l.rate || 800}</td><td style="${tdStyle}; text-align:right">₹${amt.toLocaleString()}</td><td style="${tdStyle}"></td><td style="${tdStyle}"></td></tr>`;
          }).join('')}
        </table>
        <div style="margin-top:10px; text-align:right; font-size:10px; color:#555">
          <div>Commission @5%: ₹3,000 (Deductible)</div>
          <div>User Fee @2%: ₹1,200 (Deductible)</div>
          <div>Coolie ₹20/bag: ₹1,500 (Deductible)</div>
          <div style="font-weight:bold; margin-top:6px; font-size:13px; color:#1a1a2e">Total Amount: ₹${(sampleLots.reduce((s: number, l: any) => s + ((l.rate || 800) * (l.weight || l.qty * 50) / 50), 0) - 5700).toLocaleString()}</div>
        </div>
        <div style="font-size:9px; margin-top:4px; color:#888">Total Amount in words: Rupees Fifty-One Thousand Three Hundred Only</div>
        <div style="margin-top:6px; font-size:10px"><strong>COPY NAME:</strong> Original</div>
        <div style="text-align:right; font-weight:bold; margin-top:10px">For ${FIRM.name}</div>
        ${footer}
      </div>`;

    case 'market_fee':
      return `<div style="font-family:'Segoe UI',Arial,sans-serif; max-width:700px; margin:auto; padding:20px; font-size:12px">
        ${commonHeader}
        <div style="text-align:center; font-weight:800; font-size:17px; margin-bottom:4px; color:#1a1a2e">MARKET FEE REPORT</div>
        <div style="text-align:center; font-size:11px; color:#888; margin-bottom:14px">Single Commodity: Onion A-Grade | Date: ${today}</div>
        <table style="${tableStyle}">
          <tr><th style="${thStyle}">Bill No</th><th style="${thStyle}">Purchaser</th><th style="${thStyle}">Bags</th><th style="${thStyle}">Amount</th><th style="${thStyle}">Market Fee</th></tr>
          <tr><td style="${tdStyle}">BIL-0042</td><td style="${tdStyle}">Vijay Traders</td><td style="${tdStyle}; text-align:right">30</td><td style="${tdStyle}; text-align:right">₹24,750</td><td style="${tdStyle}; text-align:right">₹495</td></tr>
          <tr><td style="${tdStyle}">BIL-0043</td><td style="${tdStyle}">Ganesh Mart</td><td style="${tdStyle}; text-align:right">25</td><td style="${tdStyle}; text-align:right">₹20,125</td><td style="${tdStyle}; text-align:right">₹403</td></tr>
          <tr style="font-weight:bold; background:#f0f4ff"><td style="${tdStyle}" colspan="2">Total</td><td style="${tdStyle}; text-align:right">55</td><td style="${tdStyle}; text-align:right">₹44,875</td><td style="${tdStyle}; text-align:right">₹898</td></tr>
        </table>
        <div style="margin-top:18px; border:1px solid #e0e4ec; padding:12px; border-radius:6px; font-size:11px; background:#fafbff">
          <strong>Payment Detail</strong><br/>
          Amount: ₹898 | Amount in Words: Rupees Eight Hundred Ninety-Eight Only<br/>
          Payment Mode: Bank Transfer – NEFT | Payment Date: ${today}
        </div>
        ${footer}
      </div>`;

    case 'gst_report':
      return `<div style="font-family:'Segoe UI',Arial,sans-serif; max-width:700px; margin:auto; padding:20px; font-size:12px">
        ${commonHeader}
        <div style="text-align:center; font-weight:800; font-size:17px; margin-bottom:4px; color:#1a1a2e">GST REPORT</div>
        <div style="text-align:center; font-size:11px; color:#888; margin-bottom:14px">From ${today} to ${today}</div>
        <table style="${tableStyle}">
          <tr><th style="${thStyle}">HSN/SAC</th><th style="${thStyle}">UQC</th><th style="${thStyle}">Total Qty</th><th style="${thStyle}">Total Value</th><th style="${thStyle}">Rate</th><th style="${thStyle}">Taxable Value</th><th style="${thStyle}">IGST</th><th style="${thStyle}">CGST</th><th style="${thStyle}">SGST</th></tr>
          <tr><td style="${tdStyle}">07031019</td><td style="${tdStyle}">Bags</td><td style="${tdStyle}; text-align:right">55</td><td style="${tdStyle}; text-align:right">₹44,875</td><td style="${tdStyle}">5%</td><td style="${tdStyle}; text-align:right">₹44,875</td><td style="${tdStyle}; text-align:right">-</td><td style="${tdStyle}; text-align:right">₹1,122</td><td style="${tdStyle}; text-align:right">₹1,122</td></tr>
          <tr style="font-weight:bold; background:#f0f4ff"><td style="${tdStyle}" colspan="5">Grand Total</td><td style="${tdStyle}; text-align:right">₹44,875</td><td style="${tdStyle}; text-align:right">-</td><td style="${tdStyle}; text-align:right">₹1,122</td><td style="${tdStyle}; text-align:right">₹1,122</td></tr>
        </table>
        ${footer}
      </div>`;

    default:
      return `<div style="font-family:Arial,sans-serif; padding:20px; text-align:center; color:#999">Template not found</div>`;
  }
}

function numberToWords(n: number): string {
  if (n === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + numberToWords(n % 100) : '');
  if (n < 100000) return numberToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + numberToWords(n % 1000) : '');
  if (n < 10000000) return numberToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + numberToWords(n % 100000) : '');
  return numberToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + numberToWords(n % 10000000) : '');
}

const PrintsPage = () => {
  const navigate = useNavigate();
  const isDesktop = useDesktopMode();
  const [search, setSearch] = useState('');
  const [selectedPrint, setSelectedPrint] = useState<typeof printTemplates[0] | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [arrivalDetails, setArrivalDetails] = useState<ArrivalDetail[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    arrivalsApi.listDetail(0, 100).then(setArrivalDetails).catch(() => setArrivalDetails([]));
  }, []);

  const filteredPrints = useMemo(() => {
    if (!search) return printTemplates;
    const q = search.toLowerCase();
    return printTemplates.filter(p => p.name.toLowerCase().includes(q) || p.stage.toLowerCase().includes(q));
  }, [search]);

  const printStages = useMemo(() => {
    const stages = [...new Set(filteredPrints.map(p => p.stage))];
    return stages.map(s => ({ stage: s, items: filteredPrints.filter(p => p.stage === s) }));
  }, [filteredPrints]);

  const handlePrint = (template: typeof printTemplates[0]) => {
    setSelectedPrint(template);
    setShowPreview(true);
  };

  const triggerWindowPrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) { toast.error('Pop-up blocked. Please allow pop-ups.'); return; }
    printWindow.document.write(`
      <html><head><title>${selectedPrint?.name || 'Print'}</title>
      <style>body { margin: 0; padding: 0; } @media print { body { margin: 0; } }</style>
      </head><body>${content.innerHTML}</body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
  };

  const exportPDF = () => {
    triggerWindowPrint();
    toast.info('Use "Save as PDF" in the print dialog to export as PDF');
  };

  const templateHTML = selectedPrint ? generateTemplateHTML(selectedPrint.id, arrivalDetails) : '';

  return (
    <div className="min-h-[100dvh] bg-background pb-28 lg:pb-6">
      {!isDesktop && (
        <div className="hero-gradient pt-[max(1.5rem,env(safe-area-inset-top))] pb-6 px-4 rounded-b-[2rem] relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2)_0%,transparent_50%)]" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => navigate('/home')} aria-label="Go back" className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Printer className="w-5 h-5" /> Print Templates
                </h1>
                <p className="text-white/70 text-xs">Stage-wise document printing</p>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
              <input aria-label="Search" placeholder="Search templates…" value={search} onChange={e => setSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-white/20 backdrop-blur text-white placeholder:text-white/50 text-sm border border-white/10 focus:outline-none" />
            </div>
          </div>
        </div>
      )}

      {isDesktop && (
        <div className="px-8 pt-6 pb-4 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search templates…" value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
        </div>
      )}

      <div className={cn("px-4", isDesktop ? "lg:px-8" : "mt-4")}>
        <div className="space-y-6">
          {printStages.map(({ stage, items }, sIdx) => (
            <motion.div key={stage} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: sIdx * 0.08 }}>
              <div className="flex items-center gap-2.5 mb-3">
                <span className={cn("px-3 py-1 rounded-full text-[11px] font-bold", stageBadgeColors[stage] || 'bg-muted text-muted-foreground')}>
                  {stage}
                </span>
                <div className="flex-1 h-px bg-border/50" />
                <span className="text-[10px] text-muted-foreground">{items.length} templates</span>
              </div>
              <div className={cn("grid gap-3", isDesktop ? "grid-cols-3 xl:grid-cols-4" : "grid-cols-2")}>
                {items.map((t, idx) => (
                  <motion.button key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                    onClick={() => handlePrint(t)}
                    className={cn("glass-card rounded-xl p-4 text-left hover:shadow-lg transition-all group border",
                      stageColors[t.stage] || 'border-border/30',
                      "bg-gradient-to-br"
                    )}>
                    <div className={cn("w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3 shadow-lg", t.color)}>
                      <t.icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="font-bold text-sm text-foreground leading-tight">{t.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{t.size}</p>
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                      <Eye className="w-3 h-3" /> Preview & Print
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Print Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className={cn("max-w-3xl max-h-[90vh] overflow-y-auto", isDesktop && "glass-card border-primary/10")}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedPrint && (
                <div className={cn("w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md", selectedPrint.color)}>
                  <selectedPrint.icon className="w-4 h-4 text-white" />
                </div>
              )}
              <div>
                <span className="text-base">{selectedPrint?.name}</span>
                <p className="text-xs text-muted-foreground font-normal mt-0.5">{selectedPrint?.size} · {selectedPrint?.stage}</p>
              </div>
            </DialogTitle>
            <DialogDescription className="sr-only">Print template preview</DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <div ref={printRef}
              className="border border-border rounded-xl p-4 bg-white text-black min-h-[300px] overflow-auto shadow-inner"
              style={{ colorScheme: 'light' }}
              dangerouslySetInnerHTML={{ __html: templateHTML }}
            />
          </div>

          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setShowPreview(false)}>Close</Button>
            <Button variant="outline" className="gap-1.5 border-red-300 text-red-700 dark:border-red-700 dark:text-red-400" onClick={exportPDF}>
              <Download className="w-4 h-4" /> Export PDF
            </Button>
            <Button onClick={triggerWindowPrint} className="bg-gradient-to-r from-primary to-accent text-white gap-1.5 shadow-lg">
              <Printer className="w-4 h-4" /> Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default PrintsPage;
