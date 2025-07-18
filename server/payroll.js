import { pool } from './database.js';

export async function generateWeeklyPayslips(weekStart) {
  try {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    // Get all active users
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE active = TRUE'
    );

    const payslips = [];

    for (const user of users) {
      // Get time entries for this user and week
      const [timeEntries] = await pool.execute(
        'SELECT * FROM time_entries WHERE user_id = ? AND week_start = ?',
        [user.id, weekStart]
      );

      if (timeEntries.length === 0) continue;

      let totalHours = 0;
      let overtimeHours = 0;
      let undertimeHours = 0;
      let firstClockIn = null;
      let lastClockOut = null;

      // Calculate hours for each day
      for (const entry of timeEntries) {
        if (!entry.clock_out) continue;

        const clockIn = new Date(entry.clock_in);
        const clockOut = new Date(entry.clock_out);

        // Track first clock in and last clock out for the week
        if (!firstClockIn || clockIn < firstClockIn) {
          firstClockIn = clockIn;
        }
        if (!lastClockOut || clockOut > lastClockOut) {
          lastClockOut = clockOut;
        }

        // Define shift times for this day
        const shiftStart = new Date(clockIn);
        shiftStart.setHours(7, 0, 0, 0); // 7:00 AM
        
        const shiftEnd = new Date(clockIn);
        shiftEnd.setHours(15, 30, 0, 0); // 3:30 PM

        // Calculate worked hours from 7:00 AM onwards only
        const effectiveClockIn = clockIn < shiftStart ? shiftStart : clockIn;
        const dailyWorkedHours = Math.max(0, (clockOut.getTime() - effectiveClockIn.getTime()) / (1000 * 60 * 60));
        
        // Standard work day is 8.5 hours (including 30-minute break)
        const standardHoursPerDay = 8.5;
        
        // Calculate daily undertime (if worked less than 8.5 hours)
        if (dailyWorkedHours < standardHoursPerDay) {
          undertimeHours += (standardHoursPerDay - dailyWorkedHours);
        }
        
        // Calculate overtime (after 3:30 PM) - only if approved
        if (clockOut > shiftEnd && entry.overtime_approved === true) {
          const dailyOvertimeHours = Math.max(0, (clockOut.getTime() - shiftEnd.getTime()) / (1000 * 60 * 60));
          overtimeHours += dailyOvertimeHours;
        }

        totalHours += dailyWorkedHours;
      }

      // Fixed base salary calculation
      const baseSalary = 200; // Always ₱200 base pay
      
      // Calculate overtime pay (₱35/hour for approved overtime only)
      const overtimePay = overtimeHours * 35;
      
      // Calculate undertime deduction (₱23.53/hour for hours not worked)
      const hourlyRate = 200 / 8.5; // ₱23.53 per hour
      const undertimeDeduction = undertimeHours * hourlyRate;
      
      // Staff house deduction
      const staffHouseDeduction = user.staff_house ? 250 : 0;
      
      // Calculate total salary
      const totalSalary = baseSalary + overtimePay - undertimeDeduction - staffHouseDeduction;

      // Check if payslip already exists
      const [existingPayslip] = await pool.execute(
        'SELECT id FROM payslips WHERE user_id = ? AND week_start = ? AND week_end = ?',
        [user.id, weekStart, weekEndStr]
      );

      if (existingPayslip.length > 0) {
        // Update existing payslip
        await pool.execute(
          `UPDATE payslips SET 
           total_hours = ?, overtime_hours = ?, undertime_hours = ?,
           base_salary = ?, overtime_pay = ?, undertime_deduction = ?,
           staff_house_deduction = ?, total_salary = ?,
           clock_in_time = ?, clock_out_time = ?
           WHERE id = ?`,
          [
            totalHours, overtimeHours, undertimeHours,
            baseSalary, overtimePay, undertimeDeduction,
            staffHouseDeduction, totalSalary,
            firstClockIn, lastClockOut,
            existingPayslip[0].id
          ]
        );
      } else {
        // Create new payslip
        const [result] = await pool.execute(
          `INSERT INTO payslips 
           (user_id, week_start, week_end, total_hours, overtime_hours, undertime_hours,
            base_salary, overtime_pay, undertime_deduction, staff_house_deduction, 
            total_salary, clock_in_time, clock_out_time, status) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
          [
            user.id, weekStart, weekEndStr, totalHours, overtimeHours, undertimeHours,
            baseSalary, overtimePay, undertimeDeduction, staffHouseDeduction,
            totalSalary, firstClockIn, lastClockOut
          ]
        );
      }

      payslips.push({
        user_id: user.id,
        username: user.username,
        department: user.department,
        total_hours: totalHours,
        overtime_hours: overtimeHours,
        undertime_hours: undertimeHours,
        base_salary: baseSalary,
        overtime_pay: overtimePay,
        undertime_deduction: undertimeDeduction,
        staff_house_deduction: staffHouseDeduction,
        total_salary: totalSalary
      });
    }

    return { success: true, payslips };
  } catch (error) {
    console.error('Error generating weekly payslips:', error);
    return { success: false, message: 'Server error' };
  }
}

export async function generatePayslipsForDateRange(startDate, endDate) {
  try {
    // Get all active users
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE active = TRUE'
    );

    const payslips = [];

    for (const user of users) {
      // Get time entries for this user and date range
      const [timeEntries] = await pool.execute(
        'SELECT * FROM time_entries WHERE user_id = ? AND DATE(clock_in) >= ? AND DATE(clock_in) <= ?',
        [user.id, startDate, endDate]
      );

      if (timeEntries.length === 0) continue;

      let totalHours = 0;
      let overtimeHours = 0;
      let undertimeHours = 0;
      let firstClockIn = null;
      let lastClockOut = null;

      // Calculate hours for each day
      for (const entry of timeEntries) {
        if (!entry.clock_out) continue;

        const clockIn = new Date(entry.clock_in);
        const clockOut = new Date(entry.clock_out);

        // Track first clock in and last clock out for the period
        if (!firstClockIn || clockIn < firstClockIn) {
          firstClockIn = clockIn;
        }
        if (!lastClockOut || clockOut > lastClockOut) {
          lastClockOut = clockOut;
        }

        // Define shift times for this day
        const shiftStart = new Date(clockIn);
        shiftStart.setHours(7, 0, 0, 0); // 7:00 AM
        
        const shiftEnd = new Date(clockIn);
        shiftEnd.setHours(15, 30, 0, 0); // 3:30 PM

        // Calculate worked hours from 7:00 AM onwards only
        const effectiveClockIn = clockIn < shiftStart ? shiftStart : clockIn;
        const dailyWorkedHours = Math.max(0, (clockOut.getTime() - effectiveClockIn.getTime()) / (1000 * 60 * 60));
        
        // Standard work day is 8.5 hours (including 30-minute break)
        const standardHoursPerDay = 8.5;
        
        // Calculate daily undertime (if worked less than 8.5 hours)
        if (dailyWorkedHours < standardHoursPerDay) {
          undertimeHours += (standardHoursPerDay - dailyWorkedHours);
        }
        
        // Calculate overtime (after 3:30 PM) - only if approved
        if (clockOut > shiftEnd && entry.overtime_approved === true) {
          const dailyOvertimeHours = Math.max(0, (clockOut.getTime() - shiftEnd.getTime()) / (1000 * 60 * 60));
          overtimeHours += dailyOvertimeHours;
        }

        totalHours += dailyWorkedHours;
      }

      // Fixed base salary calculation
      const baseSalary = 200; // Always ₱200 base pay
      
      // Calculate overtime pay (₱35/hour for approved overtime only)
      const overtimePay = overtimeHours * 35;
      
      // Calculate undertime deduction (₱23.53/hour for hours not worked)
      const hourlyRate = 200 / 8.5; // ₱23.53 per hour
      const undertimeDeduction = undertimeHours * hourlyRate;
      
      // Staff house deduction
      const staffHouseDeduction = user.staff_house ? 250 : 0;
      
      // Calculate total salary
      const totalSalary = baseSalary + overtimePay - undertimeDeduction - staffHouseDeduction;

      // Check if payslip already exists
      const [existingPayslip] = await pool.execute(
        'SELECT id FROM payslips WHERE user_id = ? AND week_start = ? AND week_end = ?',
        [user.id, startDate, endDate]
      );

      if (existingPayslip.length > 0) {
        // Update existing payslip
        await pool.execute(
          `UPDATE payslips SET 
           total_hours = ?, overtime_hours = ?, undertime_hours = ?,
           base_salary = ?, overtime_pay = ?, undertime_deduction = ?,
           staff_house_deduction = ?, total_salary = ?,
           clock_in_time = ?, clock_out_time = ?
           WHERE id = ?`,
          [
            totalHours, overtimeHours, undertimeHours,
            baseSalary, overtimePay, undertimeDeduction,
            staffHouseDeduction, totalSalary,
            firstClockIn, lastClockOut,
            existingPayslip[0].id
          ]
        );
      } else {
        // Create new payslip
        await pool.execute(
          `INSERT INTO payslips 
           (user_id, week_start, week_end, total_hours, overtime_hours, undertime_hours,
            base_salary, overtime_pay, undertime_deduction, staff_house_deduction, 
            total_salary, clock_in_time, clock_out_time, status) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
          [
            user.id, startDate, endDate, totalHours, overtimeHours, undertimeHours,
            baseSalary, overtimePay, undertimeDeduction, staffHouseDeduction,
            totalSalary, firstClockIn, lastClockOut
          ]
        );
      }

      payslips.push({
        user_id: user.id,
        username: user.username,
        department: user.department,
        total_hours: totalHours,
        overtime_hours: overtimeHours,
        undertime_hours: undertimeHours,
        base_salary: baseSalary,
        overtime_pay: overtimePay,
        undertime_deduction: undertimeDeduction,
        staff_house_deduction: staffHouseDeduction,
        total_salary: totalSalary
      });
    }

    return { success: true, payslips };
  } catch (error) {
    console.error('Error generating payslips for date range:', error);
    return { success: false, message: 'Server error' };
  }
}

export async function generatePayslipsForSpecificDays(selectedDates, userIds = null) {
  try {
    // Get users (either specific users or all active users)
    let users;
    if (userIds && userIds.length > 0) {
      const placeholders = userIds.map(() => '?').join(',');
      const [result] = await pool.execute(
        `SELECT * FROM users WHERE id IN (${placeholders}) AND active = TRUE`,
        userIds
      );
      users = result;
    } else {
      const [result] = await pool.execute(
        'SELECT * FROM users WHERE active = TRUE'
      );
      users = result;
    }

    const payslips = [];
    const sortedDates = selectedDates.sort();
    const startDate = sortedDates[0];
    const endDate = sortedDates[sortedDates.length - 1];

    for (const user of users) {
      // Get time entries for this user and selected dates
      const dateConditions = selectedDates.map(() => 'DATE(clock_in) = ?').join(' OR ');
      const [timeEntries] = await pool.execute(
        `SELECT * FROM time_entries WHERE user_id = ? AND (${dateConditions})`,
        [user.id, ...selectedDates]
      );

      if (timeEntries.length === 0) continue;

      let totalHours = 0;
      let overtimeHours = 0;
      let undertimeHours = 0;
      let firstClockIn = null;
      let lastClockOut = null;

      // Calculate hours for each day
      for (const entry of timeEntries) {
        if (!entry.clock_out) continue;

        const clockIn = new Date(entry.clock_in);
        const clockOut = new Date(entry.clock_out);

        // Track first clock in and last clock out for the period
        if (!firstClockIn || clockIn < firstClockIn) {
          firstClockIn = clockIn;
        }
        if (!lastClockOut || clockOut > lastClockOut) {
          lastClockOut = clockOut;
        }

        // Define shift times for this day
        const shiftStart = new Date(clockIn);
        shiftStart.setHours(7, 0, 0, 0); // 7:00 AM
        
        const shiftEnd = new Date(clockIn);
        shiftEnd.setHours(15, 30, 0, 0); // 3:30 PM

        // Calculate worked hours from 7:00 AM onwards only
        const effectiveClockIn = clockIn < shiftStart ? shiftStart : clockIn;
        const dailyWorkedHours = Math.max(0, (clockOut.getTime() - effectiveClockIn.getTime()) / (1000 * 60 * 60));
        
        // Standard work day is 8.5 hours (including 30-minute break)
        const standardHoursPerDay = 8.5;
        
        // Calculate daily undertime (if worked less than 8.5 hours)
        if (dailyWorkedHours < standardHoursPerDay) {
          undertimeHours += (standardHoursPerDay - dailyWorkedHours);
        }
        
        // Calculate overtime (after 3:30 PM) - only if approved
        if (clockOut > shiftEnd && entry.overtime_approved === true) {
          const dailyOvertimeHours = Math.max(0, (clockOut.getTime() - shiftEnd.getTime()) / (1000 * 60 * 60));
          overtimeHours += dailyOvertimeHours;
        }

        totalHours += dailyWorkedHours;
      }

      // Fixed base salary calculation
      const baseSalary = 200; // Always ₱200 base pay
      
      // Calculate overtime pay (₱35/hour for approved overtime only)
      const overtimePay = overtimeHours * 35;
      
      // Calculate undertime deduction (₱23.53/hour for hours not worked)
      const hourlyRate = 200 / 8.5; // ₱23.53 per hour
      const undertimeDeduction = undertimeHours * hourlyRate;
      
      // Staff house deduction
      const staffHouseDeduction = user.staff_house ? 250 : 0;
      
      // Calculate total salary
      const totalSalary = baseSalary + overtimePay - undertimeDeduction - staffHouseDeduction;

      // Check if payslip already exists
      const [existingPayslip] = await pool.execute(
        'SELECT id FROM payslips WHERE user_id = ? AND week_start = ? AND week_end = ?',
        [user.id, startDate, endDate]
      );

      if (existingPayslip.length > 0) {
        // Update existing payslip
        await pool.execute(
          `UPDATE payslips SET 
           total_hours = ?, overtime_hours = ?, undertime_hours = ?,
           base_salary = ?, overtime_pay = ?, undertime_deduction = ?,
           staff_house_deduction = ?, total_salary = ?,
           clock_in_time = ?, clock_out_time = ?
           WHERE id = ?`,
          [
            totalHours, overtimeHours, undertimeHours,
            baseSalary, overtimePay, undertimeDeduction,
            staffHouseDeduction, totalSalary,
            firstClockIn, lastClockOut,
            existingPayslip[0].id
          ]
        );
      } else {
        // Create new payslip
        await pool.execute(
          `INSERT INTO payslips 
           (user_id, week_start, week_end, total_hours, overtime_hours, undertime_hours,
            base_salary, overtime_pay, undertime_deduction, staff_house_deduction, 
            total_salary, clock_in_time, clock_out_time, status) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
          [
            user.id, startDate, endDate, totalHours, overtimeHours, undertimeHours,
            baseSalary, overtimePay, undertimeDeduction, staffHouseDeduction,
            totalSalary, firstClockIn, lastClockOut
          ]
        );
      }

      payslips.push({
        user_id: user.id,
        username: user.username,
        department: user.department,
        total_hours: totalHours,
        overtime_hours: overtimeHours,
        undertime_hours: undertimeHours,
        base_salary: baseSalary,
        overtime_pay: overtimePay,
        undertime_deduction: undertimeDeduction,
        staff_house_deduction: staffHouseDeduction,
        total_salary: totalSalary
      });
    }

    return { success: true, payslips };
  } catch (error) {
    console.error('Error generating payslips for specific days:', error);
    return { success: false, message: 'Server error' };
  }
}

export async function getPayrollReport(weekStart = null, endDate = null, selectedDates = null) {
  try {
    let query = `
      SELECT 
        p.*,
        u.username,
        u.department,
        u.gcash_number,
        u.staff_house
      FROM payslips p
      JOIN users u ON p.user_id = u.id
    `;
    
    let params = [];
    let whereConditions = [];

    if (selectedDates && selectedDates.length > 0) {
      // For specific dates
      const sortedDates = selectedDates.sort();
      whereConditions.push('p.week_start = ? AND p.week_end = ?');
      params.push(sortedDates[0], sortedDates[sortedDates.length - 1]);
    } else if (weekStart && endDate) {
      // For date range
      whereConditions.push('p.week_start >= ? AND p.week_end <= ?');
      params.push(weekStart, endDate);
    } else if (weekStart) {
      // For specific week
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      whereConditions.push('p.week_start = ?');
      params.push(weekStart);
    }

    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }

    query += ' ORDER BY u.department, u.username, p.week_start DESC';

    const [payslips] = await pool.execute(query, params);
    return payslips;
  } catch (error) {
    console.error('Error fetching payroll report:', error);
    return [];
  }
}

export async function updatePayrollEntry(payslipId, updateData) {
  try {
    const {
      totalHours,
      overtimeHours,
      undertimeHours,
      baseSalary,
      overtimePay,
      undertimeDeduction,
      staffHouseDeduction,
      clockIn,
      clockOut
    } = updateData;

    // Always ensure base salary is ₱200
    const fixedBaseSalary = 200;
    
    // Calculate total salary
    const totalSalary = fixedBaseSalary + (overtimePay || 0) - (undertimeDeduction || 0) - (staffHouseDeduction || 0);

    await pool.execute(
      `UPDATE payslips SET 
       total_hours = ?, overtime_hours = ?, undertime_hours = ?,
       base_salary = ?, overtime_pay = ?, undertime_deduction = ?,
       staff_house_deduction = ?, total_salary = ?,
       clock_in_time = ?, clock_out_time = ?
       WHERE id = ?`,
      [
        totalHours, overtimeHours, undertimeHours,
        fixedBaseSalary, overtimePay, undertimeDeduction,
        staffHouseDeduction, totalSalary,
        clockIn, clockOut, payslipId
      ]
    );

    return { success: true };
  } catch (error) {
    console.error('Error updating payroll entry:', error);
    return { success: false, message: 'Server error' };
  }
}