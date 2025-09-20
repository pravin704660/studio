                <Link href="/admin" passHref>
                    <Button variant="outline" className="w-full">
                        <Shield className="mr-2 h-4 w-4" />
                        Admin Panel
                    </Button>
                </Link>
            )}
            
            <Button varialassName="mr-2 h-4 w-4" />
                Refer &amp; Earn
            </Button>nt="outline" className="w-full" onClick={handleShare}>
                <Share2 c

            <Button variant="outline" className="w-full" onClick={() => setActiveScreen('rules')}>
                <FileText className="mr-2 h-4 w-4" />
                Rules
            </Button>
            
             <Button variant="outline" className="w-full" onClick={() => setActiveScreen('inbox')}>
                <Inbox className="mr-2 h-4 w-4" />
                Inbox
            </Button>

          <Button variant="destructive" className="w-full" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
