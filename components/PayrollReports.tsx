const calculateFromTimes = () => {
    if (!editForm.clockIn || !editForm.clockOut) return;

    const clockIn = new Date(editForm.clockIn);
    const clockOut = new Date(editForm.clockOut);
    
    // Define shift start time (7:00 AM)
    const shiftStart = new Date(clockIn);
    shiftStart.setHours(7, 0, 0, 0);
    
    // Define shift end time (3:30 PM)
    const shiftEnd = new Date(clockIn);
    shiftEnd.setHours(15, 30, 0, 0);
    
    // Work hours only count from 7:00 AM onwards
    const effectiveClockIn = clockIn < shiftStart ? shiftStart : clockIn;
    
    // Calculate worked hours from 7:00 AM onwards only
    const workedHours = Math.max(0, (clockOut.getTime() - effectiveClockIn.getTime()) / (1000 * 60 * 60));
    
    // Calculate undertime hours (if worked less than 8.5 hours)
    const standardHoursPerDay = 8.5;
    let undertimeHours = 0;
    if (workedHours < standardHoursPerDay) {
      undertimeHours = standardHoursPerDay - workedHours;
    }
    
    // Calculate overtime (after 3:30 PM) - but don't automatically add overtime pay
    // Overtime pay should only be added if there was an approved overtime request
    let overtimeHours = 0;
    if (clockOut > shiftEnd) {
      overtimeHours = Math.max(0, (clockOut.getTime() - shiftEnd.getTime()) / (1000 * 60 * 60));
    }
    
    // Fixed base salary - always ₱200
    const baseSalary = 200;
    const hourlyRate = 200 / 8.5; // ₱23.53 per hour
    
    // Don't automatically calculate overtime pay - it should be manually set based on approved requests
    const overtimePay = 0; // Admin needs to manually set this based on approved overtime requests
    const undertimeDeduction = undertimeHours * hourlyRate;
    
    setEditForm(prev => ({
      ...prev,
      totalHours: parseFloat(workedHours.toFixed(2)),
      overtimeHours: parseFloat(overtimeHours.toFixed(2)),
      undertimeHours: parseFloat(undertimeHours.toFixed(2)),
      baseSalary: parseFloat(baseSalary.toFixed(2)),
      overtimePay: parseFloat(overtimePay.toFixed(2)),
      undertimeDeduction: parseFloat(undertimeDeduction.toFixed(2))
    }));
  };

            {/* Important Note */}
            <div className="bg-orange-900/20 p-4 rounded-lg mb-6 border border-orange-800/50">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-orange-400 mb-1">Overtime Pay Policy</p>
                  <p className="text-xs text-orange-300">
                    Overtime pay should only be added when the employee has submitted an overtime request 
                    that was approved by an administrator. Check the overtime requests section to verify 
                    approval before adding overtime compensation.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-900/20 p-4 rounded-lg mb-6 border border-blue-800/50">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-400 mb-1">Payroll Calculation Rules</p>
                  <ul className="text-xs text-blue-300 space-y-1">
                    <li>• Work hours only count from 7:00 AM onwards</li>
                    <li>• Base pay is fixed at ₱200 per day</li>
                    <li>• Undertime deduction applies if worked less than 8.5 hours (₱23.53/hour)</li>
                    <li>• Overtime pay (₱35/hour) only applies to approved overtime requests</li>
                    <li>• Overtime hours are calculated but pay requires manual approval</li>
                    <li>• Final pay = ₱200 + Overtime Pay - Undertime Deduction - Staff House</li>
                  </ul>
                </div>
              </div>
            </div>
