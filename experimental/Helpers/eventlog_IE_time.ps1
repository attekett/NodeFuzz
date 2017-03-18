
((Get-EventLog –Logname Application -Source "Application Error" -Message *IEXPLORE* -Newest 1).TimeGenerated.ToUniversalTime().Ticks - 621355968000000000) / 10000000;