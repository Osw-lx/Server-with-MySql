import { Request, Response } from "express";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import pool from "../conf/dbConnection";


interface Product extends RowDataPacket {
  id: number;
  name: string;
  price: string;
  stock: number;
  description: string;
  brand: string | null;
  img: string | null;
  active: number;
}

// Convierte el :id a entero positivo, o devuelve null si no es válido
const parseId = (value: string | string[] | undefined): number | null => {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

// Precio numérico, mayor que cero, máximo 2 decimales
const isValidPrice = (price: unknown): boolean => {
  if (typeof price !== "number" && typeof price !== "string") return false;
  if (typeof price === "string" && price.trim() === "") return false;
  const n = Number(price);
  return Number.isFinite(n) && n > 0 && n < 100000000 && /^\d+(\.\d{1,2})?$/.test(String(n));
};

const serverError = (res: Response, error: unknown) => {
  console.error(error); // el detalle se queda en el servidor
  return res.status(500).json({ message: "Error interno del servidor" });
};

export const getAll = async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<Product[]>(
      "SELECT id, name, price, stock, description, brand, img, active FROM products WHERE active = TRUE"
    );
    return res.status(200).json({ data: rows });
  } catch (error) {
    return serverError(res, error);
  }
};

export const getById = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "El id debe ser un entero positivo" });
  }

  try {
    const [rows] = await pool.query<Product[]>(
      "SELECT id, name, price, stock, description, brand, img, active FROM products WHERE id = ? AND active = TRUE",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    return res.status(200).json({ data: rows[0] });
  } catch (error) {
    return serverError(res, error);
  }
};


export const create = async (req: Request, res: Response) => {
  const { name, price, stock, description, brand, img } = req.body ?? {};

  if (typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({ message: "name es obligatorio" });
  }
  if (!isValidPrice(price)) {
    return res.status(400).json({ message: "price debe ser numérico, mayor que cero y con máximo 2 decimales" });
  }
  if (!Number.isInteger(stock) || stock < 0) {
    return res.status(400).json({ message: "stock debe ser un entero mayor o igual a cero" });
  }
  if (typeof description !== "string" || description.trim() === "") {
    return res.status(400).json({ message: "description es obligatorio" });
  }

  try {
    const [result] = await pool.query<ResultSetHeader>(
      "INSERT INTO products (name, price, stock, description, brand, img) VALUES (?, ?, ?, ?, ?, ?)",
      [name.trim(), Number(price), stock, description.trim(), brand ?? null, img ?? null]
    );
    return res.status(201).json({ message: "Producto creado", id: result.insertId });
  } catch (error) {
    return serverError(res, error);
  }
};

export const update = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "El id debe ser un entero positivo" });
  }

  const { name, price, stock, description, brand, img } = req.body ?? {};

  if (typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({ message: "name es obligatorio" });
  }
  if (!isValidPrice(price)) {
    return res.status(400).json({ message: "price debe ser numérico, mayor que cero y con máximo 2 decimales" });
  }
  if (!Number.isInteger(stock) || stock < 0) {
    return res.status(400).json({ message: "stock debe ser un entero mayor o igual a cero" });
  }
  if (typeof description !== "string" || description.trim() === "") {
    return res.status(400).json({ message: "description es obligatorio" });
  }

  try {
    const [result] = await pool.query<ResultSetHeader>(
      "UPDATE products SET name = ?, price = ?, stock = ?, description = ?, brand = ?, img = ? WHERE id = ? AND active = TRUE",
      [name.trim(), Number(price), stock, description.trim(), brand ?? null, img ?? null, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    return res.status(200).json({ message: "Producto actualizado" });
  } catch (error) {
    return serverError(res, error);
  }
};

export const remove = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "El id debe ser un entero positivo" });
  }

  try {
    const [result] = await pool.query<ResultSetHeader>(
      "UPDATE products SET active = FALSE WHERE id = ? AND active = TRUE",
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    return res.status(200).json({ message: "Producto dado de baja" });
  } catch (error) {
    return serverError(res, error);
  }
};

export const changePrice = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "El id debe ser un entero positivo" });
  }

  const body = req.body ?? {};
  const keys = Object.keys(body);
  if (keys.length !== 1 || keys[0] !== "price") {
    return res.status(400).json({ message: "El cuerpo debe contener solamente price" });
  }
  if (!isValidPrice(body.price)) {
    return res.status(400).json({ message: "price debe ser numérico, mayor que cero y con máximo 2 decimales" });
  }

  try {
    const [result] = await pool.query<ResultSetHeader>(
      "UPDATE products SET price = ? WHERE id = ? AND active = TRUE",
      [Number(body.price), id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    return res.status(200).json({ message: "Precio actualizado" });
  } catch (error) {
    return serverError(res, error);
  }
};