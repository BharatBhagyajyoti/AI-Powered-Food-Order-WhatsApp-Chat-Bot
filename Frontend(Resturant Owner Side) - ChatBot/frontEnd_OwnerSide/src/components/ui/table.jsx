import React from "react";

export const Table = ({ children }) => (
  <table className="min-w-full border border-gray-200 text-sm text-gray-800">{children}</table>
);

export const TableHeader = ({ children }) => (
  <thead className="bg-gray-100 font-medium text-gray-700">{children}</thead>
);

export const TableRow = ({ children }) => <tr className="border-b">{children}</tr>;

export const TableHead = ({ children }) => (
  <th className="px-4 py-2 text-left">{children}</th>
);

export const TableBody = ({ children }) => <tbody>{children}</tbody>;

export const TableCell = ({ children }) => (
  <td className="px-4 py-2">{children}</td>
);
