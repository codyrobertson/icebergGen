import { supabase } from './supabase';

/**
 * Generic function to fetch data from a table
 */
export async function fetchData<T>(
  table: string,
  options?: {
    columns?: string;
    filter?: { column: string; value: any };
    order?: { column: string; ascending?: boolean };
    limit?: number;
    offset?: number;
  }
) {
  try {
    let query = supabase.from(table).select(options?.columns || '*');

    if (options?.filter) {
      query = query.eq(options.filter.column, options.filter.value);
    }

    if (options?.order) {
      query = query.order(options.order.column, {
        ascending: options.order.ascending ?? true,
      });
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data as T[];
  } catch (error) {
    console.error(`Error fetching data from ${table}:`, error);
    throw error;
  }
}

/**
 * Generic function to insert data into a table
 */
export async function insertData<T>(table: string, data: Partial<T> | Partial<T>[]) {
  try {
    const { data: insertedData, error } = await supabase.from(table).insert(data).select();

    if (error) {
      throw error;
    }

    return insertedData as T[];
  } catch (error) {
    console.error(`Error inserting data into ${table}:`, error);
    throw error;
  }
}

/**
 * Generic function to update data in a table
 */
export async function updateData<T>(
  table: string,
  id: string | number,
  data: Partial<T>,
  idColumn = 'id'
) {
  try {
    const { data: updatedData, error } = await supabase
      .from(table)
      .update(data)
      .eq(idColumn, id)
      .select();

    if (error) {
      throw error;
    }

    return updatedData as T[];
  } catch (error) {
    console.error(`Error updating data in ${table}:`, error);
    throw error;
  }
}

/**
 * Generic function to delete data from a table
 */
export async function deleteData(table: string, id: string | number, idColumn = 'id') {
  try {
    const { error } = await supabase.from(table).delete().eq(idColumn, id);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error(`Error deleting data from ${table}:`, error);
    throw error;
  }
} 