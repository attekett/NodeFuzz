
(Get-EventLog –Logname Application -Source "Application Error" -Message *IEXPLORE* -Newest 1).Message